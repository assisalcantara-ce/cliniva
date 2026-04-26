"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const weekDays = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terca" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sabado" },
];

const defaultRules = weekDays.map((day) => ({
  day_of_week: day.value,
  start_time: day.value >= 1 && day.value <= 5 ? "14:00" : "",
  end_time: day.value >= 1 && day.value <= 5 ? "17:00" : "",
  is_active: day.value >= 1 && day.value <= 5,
}));

type AvailabilityRule = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
};

type Patient = {
  id: string;
  full_name: string;
};

type Appointment = {
  id: string;
  status: string;
  source: string;
  scheduled_start: string;
  scheduled_end: string;
  patient_name: string | null;
};

type Block = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason?: string | null;
};

function formatDateTime(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR");
}

function formatDateLabel(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00-03:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatMonthLabel(date: Date) {
  return date.toLocaleString("pt-BR", { month: "long", year: "numeric" });
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getCalendarDays(monthDate: Date) {
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const days: { date: Date; inMonth: boolean }[] = [];

  const startWeekday = start.getDay();
  for (let i = 0; i < startWeekday; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() - (startWeekday - i));
    days.push({ date: d, inMonth: false });
  }

  for (let d = 1; d <= end.getDate(); d += 1) {
    days.push({ date: new Date(monthDate.getFullYear(), monthDate.getMonth(), d), inMonth: true });
  }

  const totalCells = Math.ceil(days.length / 7) * 7;
  const lastDay = days[days.length - 1]?.date ?? end;
  const originalLength = days.length;
  for (let i = originalLength; i < totalCells; i += 1) {
    const next = new Date(lastDay);
    next.setDate(lastDay.getDate() + (i - originalLength + 1));
    days.push({ date: next, inMonth: false });
  }

  return days;
}

export default function AppointmentsPage() {
  const [rules, setRules] = useState<AvailabilityRule[]>(defaultRules);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [slotsDate, setSlotsDate] = useState("");
  const [slots, setSlots] = useState<{ time: string }[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [notes, setNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [isSavingBlock, setIsSavingBlock] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  const rulesByDay = useMemo(() => {
    const map = new Map<number, AvailabilityRule>();
    rules.forEach((rule) => map.set(rule.day_of_week, rule));
    return map;
  }, [rules]);

  const calendarDays = useMemo(() => getCalendarDays(calendarMonth), [calendarMonth]);

  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    appointments.forEach((appt) => {
      const d = new Date(appt.scheduled_start);
      if (Number.isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(appt);
      map.set(key, list);
    });
    return map;
  }, [appointments]);

  const appointmentsForSelectedDay = useMemo(() => {
    if (!selectedCalendarDate) return [] as Appointment[];
    return appointmentsByDay.get(selectedCalendarDate) ?? [];
  }, [appointmentsByDay, selectedCalendarDate]);

  function getStatusBadge(status: string) {
    if (status === "confirmed") {
      return "bg-emerald-100 text-emerald-700";
    }
    if (status === "cancelled") {
      return "bg-rose-100 text-rose-700";
    }
    return "bg-amber-100 text-amber-700";
  }

  function isDayAvailable(date: Date) {
    const rule = rulesByDay.get(date.getDay());
    return Boolean(rule?.is_active);
  }

  function normalizeRules(data: AvailabilityRule[]) {
    return weekDays.map((day) => {
      const existing = data.find((r) => r.day_of_week === day.value);
      if (existing) return { ...existing, is_active: existing.is_active !== false };
      return defaultRules.find((r) => r.day_of_week === day.value) as AvailabilityRule;
    });
  }

  async function loadAvailability() {
    const res = await fetch("/api/availability", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { rules: AvailabilityRule[] };
    setRules(normalizeRules(json.rules ?? []));
  }

  async function loadPatients() {
    const res = await fetch("/api/patients", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { patients: Patient[] };
    setPatients(json.patients ?? []);
  }

  async function loadAppointments() {
    const res = await fetch("/api/appointments", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { appointments: Appointment[] };
    setAppointments(json.appointments ?? []);
  }

  async function loadBlocks() {
    const res = await fetch("/api/availability/blocks", { cache: "no-store" });
    if (!res.ok) return;
    const json = (await res.json()) as { blocks: Block[] };
    setBlocks(json.blocks ?? []);
  }

  useEffect(() => {
    void loadAvailability();
    void loadPatients();
    void loadAppointments();
    void loadBlocks();
  }, []);

  function updateRule(dayOfWeek: number, patch: Partial<AvailabilityRule>) {
    setRules((prev) =>
      prev.map((rule) =>
        rule.day_of_week === dayOfWeek ? { ...rule, ...patch } : rule,
      ),
    );
  }

  async function saveRules() {
    setIsSavingRules(true);
    try {
      const payload = {
        rules: rules
          .filter((rule) => rule.is_active)
          .map((rule) => ({
            ...rule,
            timezone: "America/Sao_Paulo",
          })),
      };

      const res = await fetch("/api/availability", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = (await res.json()) as { rules: AvailabilityRule[] };
        setRules(normalizeRules(json.rules ?? []));
      }
    } finally {
      setIsSavingRules(false);
    }
  }

  async function fetchSlots() {
    if (!slotsDate) return;
    setIsLoadingSlots(true);
    setSelectedTime("");
    try {
      const res = await fetch(
        `/api/appointments/slots?start_date=${slotsDate}&end_date=${slotsDate}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const json = (await res.json()) as { slots: { time: string }[] };
      setSlots(json.slots ?? []);
    } finally {
      setIsLoadingSlots(false);
    }
  }

  async function createAppointment() {
    if (!selectedPatient || !slotsDate || !selectedTime) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patient_id: selectedPatient,
          date: slotsDate,
          time: selectedTime,
          notes: notes.trim() ? notes.trim() : undefined,
          source: "app",
        }),
      });

      if (res.ok) {
        setSelectedTime("");
        setNotes("");
        await loadAppointments();
        await fetchSlots();
        setSelectedCalendarDate(slotsDate);
      }
    } finally {
      setIsCreating(false);
    }
  }

  async function createBlock() {
    if (!blockStart || !blockEnd) return;
    setIsSavingBlock(true);
    try {
      const res = await fetch("/api/availability/blocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          starts_at: new Date(blockStart).toISOString(),
          ends_at: new Date(blockEnd).toISOString(),
          reason: blockReason.trim() ? blockReason.trim() : undefined,
        }),
      });

      if (res.ok) {
        setBlockStart("");
        setBlockEnd("");
        setBlockReason("");
        await loadBlocks();
        await fetchSlots();
      }
    } finally {
      setIsSavingBlock(false);
    }
  }

  async function deleteBlock(id: string) {
    const res = await fetch("/api/availability/blocks", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      await loadBlocks();
      await fetchSlots();
    }
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="title-icon">📅</div>
          <div>
            <h1 className="page-title">Agendamentos</h1>
            <p className="page-subtitle">Defina disponibilidade e receba agendamentos</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="admin-card">
          <CardHeader className="admin-card__header">
            <CardTitle className="admin-card__title">Disponibilidade semanal</CardTitle>
          </CardHeader>
          <CardContent className="admin-card__content space-y-2">
            {weekDays.map((day) => {
              const rule = rulesByDay.get(day.value);
              return (
                <div key={day.value} className="grid grid-cols-12 items-center gap-3">
                  <div className="col-span-3 text-sm font-semibold text-foreground">
                    {day.label}
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="time"
                      value={rule?.start_time ?? ""}
                      onChange={(e) =>
                        updateRule(day.value, { start_time: e.target.value })
                      }
                      disabled={!rule?.is_active}
                      className="control"
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="time"
                      value={rule?.end_time ?? ""}
                      onChange={(e) =>
                        updateRule(day.value, { end_time: e.target.value })
                      }
                      disabled={!rule?.is_active}
                      className="control"
                    />
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <input
                      type="checkbox"
                      checked={rule?.is_active ?? false}
                      onChange={(e) =>
                        updateRule(day.value, { is_active: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <span className="text-xs text-muted-foreground">Ativo</span>
                  </div>
                </div>
              );
            })}
            <Button
              onClick={saveRules}
              disabled={isSavingRules}
              className="h-10 w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold"
            >
              {isSavingRules ? "Salvando..." : "Salvar disponibilidade"}
            </Button>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="admin-card__header">
            <CardTitle className="admin-card__title">Novo agendamento</CardTitle>
          </CardHeader>
          <CardContent className="admin-card__content">
            <div className="space-y-3">
                <div className="field">
                  <label className="label">Paciente</label>
                  <Select
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="control"
                  >
                    <option value="">Selecione...</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.full_name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="field">
                  <label className="label">Data</label>
                  <Input
                    type="date"
                    value={slotsDate}
                    onChange={(e) => setSlotsDate(e.target.value)}
                    className="control"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={fetchSlots}
                    disabled={!slotsDate || isLoadingSlots}
                  >
                    {isLoadingSlots ? "Buscando..." : "Buscar horarios"}
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    {slots.length ? `${slots.length} horarios disponiveis` : ""}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setSelectedTime(slot.time)}
                      className={`rounded-md border px-3 py-2 text-xs font-semibold transition-all ${
                        selectedTime === slot.time
                          ? "border-teal-600 bg-teal-600 text-white"
                          : "border-border bg-white text-foreground hover:border-teal-500"
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="label block">Notas (opcional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="control min-h-[120px] w-full resize-y border border-teal-200"
                    placeholder="Observacoes para este atendimento"
                  />
                </div>

                <Button
                  onClick={createAppointment}
                  disabled={!selectedPatient || !selectedTime || isCreating}
                  className="h-10 w-full text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isCreating ? "Agendando..." : "Confirmar agendamento"}
                </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="admin-card">
          <CardHeader className="admin-card__header">
            <CardTitle className="admin-card__title">Proximos atendimentos</CardTitle>
          </CardHeader>
          <CardContent className="admin-card__content max-h-[480px] overflow-y-auto">
            <div className="divide-y divide-border">
              {appointments.length === 0 ? (
                <div className="py-4 text-sm text-muted-foreground">
                  Nenhum agendamento encontrado.
                </div>
              ) : (
                appointments.map((appt) => (
                  <div key={appt.id} className="py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-foreground">
                          {appt.patient_name ?? "Paciente"}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {formatDateTime(appt.scheduled_start)}
                        </div>
                      </div>
                      <div className="text-[11px] font-semibold uppercase text-muted-foreground">
                        {appt.status}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="admin-card">
          <CardHeader className="admin-card__header">
            <CardTitle className="admin-card__title">Bloqueios de agenda</CardTitle>
          </CardHeader>
          <CardContent className="admin-card__content max-h-[480px] overflow-y-auto space-y-3">
            <div className="grid gap-3">
              <div className="field">
                <label className="label">Inicio</label>
                <Input
                  type="datetime-local"
                  value={blockStart}
                  onChange={(e) => setBlockStart(e.target.value)}
                  className="control"
                />
              </div>
              <div className="field">
                <label className="label">Fim</label>
                <Input
                  type="datetime-local"
                  value={blockEnd}
                  onChange={(e) => setBlockEnd(e.target.value)}
                  className="control"
                />
              </div>
              <div className="field">
                <label className="label">Motivo (opcional)</label>
                <Input
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  className="control"
                />
              </div>
              <Button
                type="button"
                onClick={createBlock}
                disabled={!blockStart || !blockEnd || isSavingBlock}
                className="h-10 w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold"
              >
                {isSavingBlock ? "Salvando..." : "Adicionar bloqueio"}
              </Button>
            </div>

            <div className="divide-y divide-border">
              {blocks.length === 0 ? (
                <div className="py-3 text-sm text-muted-foreground">
                  Nenhum bloqueio cadastrado.
                </div>
              ) : (
                blocks.map((block) => (
                  <div key={block.id} className="py-2 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-foreground">
                          {formatDateTime(block.starts_at)} - {formatDateTime(block.ends_at)}
                        </div>
                        {block.reason ? (
                          <div className="text-[11px] text-muted-foreground">{block.reason}</div>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteBlock(block.id)}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="admin-card">
        <CardHeader className="admin-card__header">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="admin-card__title">Calendario mensal</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
                  )
                }
                className="text-sm"
              >
                Mes anterior
              </Button>
              <div className="text-sm font-semibold text-foreground capitalize">
                {formatMonthLabel(calendarMonth)}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setCalendarMonth(
                    new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
                  )
                }
                className="text-sm"
              >
                Proximo mes
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="admin-card__content space-y-4">
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-muted/20 px-4 py-3">
            <span className="text-[11px] font-semibold uppercase text-muted-foreground">Legenda</span>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-medium text-foreground">Confirmado</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                <span className="text-xs font-medium text-foreground">Pendente</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                <span className="text-xs font-medium text-foreground">Cancelado</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 rounded-lg border border-border bg-muted/10 px-3 py-2">
            <div className="text-[11px] font-bold uppercase text-teal-700 text-center">Dom</div>
            <div className="text-[11px] font-bold uppercase text-teal-700 text-center">Seg</div>
            <div className="text-[11px] font-bold uppercase text-teal-700 text-center">Ter</div>
            <div className="text-[11px] font-bold uppercase text-teal-700 text-center">Qua</div>
            <div className="text-[11px] font-bold uppercase text-teal-700 text-center">Qui</div>
            <div className="text-[11px] font-bold uppercase text-teal-700 text-center">Sex</div>
            <div className="text-[11px] font-bold uppercase text-teal-700 text-center">Sab</div>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const key = day.date.toISOString().slice(0, 10);
              const dayAppointments = appointmentsByDay.get(key) ?? [];
              const isAvailable = isDayAvailable(day.date);
              const isSelected = selectedCalendarDate === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setSelectedCalendarDate(key);
                    setSlotsDate(key);
                    void fetchSlots();
                  }}
                  className={`min-h-[96px] rounded-lg border px-2 py-2 text-left text-xs shadow-sm transition-all ${
                    day.inMonth
                      ? "border-border bg-white/90"
                      : "border-dashed border-border/70 bg-muted/20 text-muted-foreground"
                  } ${
                    isSelected
                      ? "ring-2 ring-teal-500 border-teal-200 bg-teal-50/70"
                      : "hover:border-teal-200 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`text-sm font-semibold ${day.inMonth ? "text-foreground" : "text-muted-foreground"}`}>
                      {day.date.getDate()}
                    </div>
                    {isAvailable ? (
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Disponivel
                      </span>
                    ) : (
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        Fechado
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-1">
                    {dayAppointments.length === 0 ? (
                      <div className="text-[11px] text-muted-foreground">Sem agendamentos</div>
                    ) : (
                      dayAppointments.slice(0, 3).map((appt) => (
                        <div
                          key={appt.id}
                          className="rounded-md border border-teal-100 bg-teal-50/70 px-2 py-1 text-[11px] text-teal-800"
                        >
                          <div className="font-semibold">
                            {new Date(appt.scheduled_start).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                          <div className="truncate">
                            {appt.patient_name ?? "Paciente"}
                          </div>
                            <div className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusBadge(appt.status)}`}>
                              {appt.status}
                            </div>
                        </div>
                      ))
                    )}
                    {dayAppointments.length > 3 ? (
                      <div className="text-[11px] text-muted-foreground">
                        +{dayAppointments.length - 3} outros
                      </div>
                    ) : null}
                  </div>
                  </button>
              );
            })}
          </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Horarios do dia</div>
                <div className="mt-2 text-sm font-semibold text-foreground">
                  {selectedCalendarDate ? formatDateLabel(selectedCalendarDate) : "Selecione um dia"}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedCalendarDate && slots.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Nenhum horario livre.</div>
                  ) : (
                    slots.map((slot) => (
                      <span
                        key={slot.time}
                        className="rounded-md border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800"
                      >
                        {slot.time}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-4">
                <div className="text-xs font-semibold uppercase text-muted-foreground">Agendamentos do dia</div>
                <div className="mt-2 text-sm font-semibold text-foreground">
                  {selectedCalendarDate ? formatDateLabel(selectedCalendarDate) : "Selecione um dia"}
                </div>
                <div className="mt-3 space-y-2">
                  {selectedCalendarDate && appointmentsForSelectedDay.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Nenhum agendamento.</div>
                  ) : (
                    appointmentsForSelectedDay.map((appt) => (
                      <div
                        key={appt.id}
                        className="rounded-md border border-border bg-white px-3 py-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-semibold text-foreground">
                            {appt.patient_name ?? "Paciente"}
                          </div>
                          <div className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusBadge(appt.status)}`}>
                            {appt.status}
                          </div>
                        </div>
                        <div className="mt-1 text-muted-foreground">
                          {new Date(appt.scheduled_start).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
