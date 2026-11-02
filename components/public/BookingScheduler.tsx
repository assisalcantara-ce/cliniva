"use client";

import { useEffect, useState } from "react";

interface SlotItem {
  id: string;
  start: string;
  end: string;
  timeFormatted: string;
}

interface BookingSchedulerProps {
  slug: string;
  therapistName: string;
}

export function BookingScheduler({ slug, therapistName }: BookingSchedulerProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Começa pelo dia de amanhã
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });

  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Carrega horários disponíveis ao mudar a data
  useEffect(() => {
    let isCancelled = false;
    async function fetchSlots() {
      setLoadingSlots(true);
      setSlotsError(null);
      setSelectedSlot(null);

      try {
        const res = await fetch(
          `/api/appointments/slots/public?therapist=${encodeURIComponent(slug)}&start_date=${selectedDate}&end_date=${selectedDate}`
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Não foi possível carregar os horários disponíveis.");
        }

        const data = await res.json();
        if (!isCancelled) {
          const rawSlots = Array.isArray(data.slots) ? data.slots : [];
          const formatted: SlotItem[] = rawSlots.map((s: any, idx: number) => {
            const startDate = new Date(s.start || s.start_time);
            const timeFormatted = !isNaN(startDate.getTime())
              ? new Intl.DateTimeFormat("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "America/Sao_Paulo",
                }).format(startDate)
              : s.time || "Horário a confirmar";

            return {
              id: s.id || `slot-${idx}`,
              start: s.start || s.start_time,
              end: s.end || s.end_time,
              timeFormatted,
            };
          });

          setSlots(formatted);
        }
      } catch (err) {
        if (!isCancelled) {
          setSlotsError(err instanceof Error ? err.message : "Erro ao consultar horários.");
          setSlots([]);
        }
      } finally {
        if (!isCancelled) {
          setLoadingSlots(false);
        }
      }
    }

    if (selectedDate) {
      fetchSlots();
    }

    return () => {
      isCancelled = true;
    };
  }, [slug, selectedDate]);

  // Submissão do agendamento
  async function handleBooking(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) {
      setSubmitError("Por favor, selecione um horário para a sua consulta.");
      return;
    }

    if (!consentGiven) {
      setSubmitError("É necessário concordar com a política de privacidade e termos do agendamento.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      // Gera idempotency_key único para impedir agendamento duplicado
      const idempotencyKey = `web-${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const payload = {
        therapist: slug,
        full_name: fullName.trim(),
        date: selectedDate,
        time: selectedSlot.timeFormatted,
        notes: notes.trim(),
        idempotency_key: idempotencyKey,
        consent: {
          purpose: "clinical_scheduling",
          notice_version: "2026-v1",
        },
        anamnesis: {
          personal: {
            email: email.trim(),
            phone: phone.trim(),
          },
        },
      };

      const res = await fetch("/api/appointments/landing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Não foi possível confirmar o agendamento. Tente outro horário.");
      }

      setBookingSuccess(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Erro ao processar agendamento.");
    } finally {
      setSubmitting(false);
    }
  }

  if (bookingSuccess) {
    return (
      <div className="bg-white rounded-2xl border border-emerald-200 p-8 shadow-sm text-center">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl">
          ✓
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Solicitação de Consulta Enviada!</h3>
        <p className="text-sm text-slate-600 max-w-md mx-auto mb-4 leading-relaxed">
          Olá, <strong>{fullName}</strong>. Sua solicitação para o dia{" "}
          <strong>{new Intl.DateTimeFormat("pt-BR").format(new Date(selectedDate + "T12:00:00"))}</strong> às{" "}
          <strong>{selectedSlot?.timeFormatted}</strong> foi registrada diretamente na agenda de {therapistName}.
        </p>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
          Você receberá as orientações e o link da sessão pelo WhatsApp/E-mail informado.
        </p>
        <button
          onClick={() => {
            setBookingSuccess(false);
            setSelectedSlot(null);
            setFullName("");
            setEmail("");
            setPhone("");
            setNotes("");
          }}
          className="text-xs font-semibold text-teal-700 hover:text-teal-800 underline"
        >
          Agendar outra sessão
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
      <form onSubmit={handleBooking} className="space-y-6">
        {/* Seletor de Data */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            1. Escolha a data
          </label>
          <input
            type="date"
            min={new Date().toISOString().slice(0, 10)}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-64 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-slate-800"
          />
        </div>

        {/* Grade de Horários */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            2. Horários Disponíveis
          </label>

          {loadingSlots ? (
            <div className="py-6 text-center text-sm text-slate-400">
              Verificando disponibilidade na agenda...
            </div>
          ) : slotsError ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              {slotsError}
            </div>
          ) : slots.length === 0 ? (
            <div className="py-6 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Nenhum horário livre nesta data. Por favor, escolha outro dia acima ou consulte pelo chat.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {slots.map((s) => {
                const isSelected = selectedSlot?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSlot(s)}
                    className={`py-2 px-3 rounded-xl text-sm font-semibold border transition text-center ${
                      isSelected
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "bg-white text-slate-700 border-slate-200 hover:border-teal-500 hover:bg-teal-50/50"
                    }`}
                  >
                    {s.timeFormatted}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Formulário de Identificação */}
        {selectedSlot && (
          <div className="pt-6 border-t border-slate-100 space-y-4 animate-in fade-in">
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-center justify-between">
              <span>
                Horário selecionado: <strong>{selectedSlot.timeFormatted}</strong>
              </span>
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="text-[11px] underline text-teal-700 hover:text-teal-900 font-semibold"
              >
                Trocar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Seu Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Como gostaria de ser chamado(a)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  WhatsApp com DDD *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                E-mail para confirmação *
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Motivo da consulta ou observações (opcional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Gostaria de trabalhar ansiedade no trabalho..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            {/* Consentimento LGPD */}
            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="consent-check"
                type="checkbox"
                required
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <label htmlFor="consent-check" className="text-xs text-slate-600 leading-snug">
                Concordo com o tratamento dos meus dados de contato exclusivamente para agendamento e comunicação com o profissional, sob sigilo profissional e conforme a LGPD.
              </label>
            </div>

            {submitError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-sm transition text-sm flex items-center justify-center gap-2"
            >
              {submitting ? "Confirmando Agendamento..." : "Solicitar Agendamento da Sessão"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
