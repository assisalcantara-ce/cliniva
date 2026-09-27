"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export interface ModalPatientOption {
  id: string;
  fullName: string;
}

export interface ModalSlotOption {
  time: string;
}

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: ModalPatientOption[];
  availableSlots: ModalSlotOption[];
  isLoadingSlots?: boolean;
  initialDate?: string;
  initialTime?: string;
  onDateChange?: (date: string) => void;
  onSubmit: (data: {
    patientId: string;
    date: string;
    time: string;
    notes?: string;
  }) => Promise<void> | void;
  isSubmitting?: boolean;
  isDateClosed?: boolean;
  hasPastSlotsOnly?: boolean;
  isFullyBooked?: boolean;
  slotErrorMessage?: string | null;
}

function CreateAppointmentModalContent({
  onClose,
  patients,
  availableSlots,
  isLoadingSlots = false,
  initialDate = "",
  initialTime = "",
  onDateChange,
  onSubmit,
  isSubmitting = false,
  isDateClosed = false,
  hasPastSlotsOnly = false,
  isFullyBooked = false,
  slotErrorMessage = null,
}: Omit<CreateAppointmentModalProps, "isOpen">) {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [date, setDate] = useState(initialDate);
  const [selectedTime, setSelectedTime] = useState(initialTime);
  const [notes, setNotes] = useState("");

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    setSelectedTime("");
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatientId || !date || !selectedTime || isSubmitting) return;

    await onSubmit({
      patientId: selectedPatientId,
      date,
      time: selectedTime,
      notes: notes.trim() ? notes.trim() : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl space-y-6">
        {/* Modal Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Novo Agendamento</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecione o paciente, a data e um horário disponível.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Paciente */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Paciente *</label>
            <Select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm focus:border-teal-500 focus:outline-none"
              required
            >
              <option value="">Selecione um paciente cadastrado...</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </Select>
          </div>

          {/* Data */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Data do Atendimento *</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm focus:border-teal-500 focus:outline-none"
              required
            />
          </div>

          {/* Horários Disponíveis */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">Horário *</label>
              {isLoadingSlots && (
                <span className="text-[11px] text-muted-foreground animate-pulse">
                  Buscando horários...
                </span>
              )}
            </div>

            {availableSlots.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 bg-muted/10 p-3 text-center text-xs text-muted-foreground">
                {!date
                  ? "Selecione uma data para ver os horários."
                  : slotErrorMessage
                  ? slotErrorMessage
                  : isDateClosed
                  ? "Este dia da semana está fechado na sua grade de disponibilidade."
                  : hasPastSlotsOnly
                  ? "Todos os horários de atendimento desta data já passaram."
                  : isFullyBooked
                  ? "Todos os horários desta data estão ocupados por outros atendimentos ou bloqueios."
                  : "Nenhum horário livre nesta data."}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => setSelectedTime(slot.time)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                      selectedTime === slot.time
                        ? "border-teal-600 bg-teal-600 text-white shadow-xs"
                        : "border-border bg-white text-foreground hover:border-teal-500 hover:bg-teal-50"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Observações (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Primeira consulta, alinhamento prévio, etc."
              rows={3}
              className="w-full rounded-lg border border-border bg-white p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-teal-500 focus:outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/70">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 text-xs font-semibold px-4"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!selectedPatientId || !date || !selectedTime || isSubmitting}
              className="h-10 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-5 shadow-xs"
            >
              {isSubmitting ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CreateAppointmentModal(props: CreateAppointmentModalProps) {
  if (!props.isOpen) return null;

  return (
    <CreateAppointmentModalContent
      key={`${props.initialDate}-${props.initialTime}`}
      {...props}
    />
  );
}
