"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppointmentsHeader,
  CalendarView,
  DaySchedulePanel,
  CreateAppointmentModal,
  WeeklyAvailabilityConfig,
  AvailabilityBlocksManager,
  type AppointmentTab,
} from "@/components/appointments";

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
  start_time: "14:00",
  end_time: "17:00",
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
  patient_id?: string;
  status: string;
  source?: string;
  scheduled_start: string;
  scheduled_end: string;
  patient_name: string | null;
  notes?: string | null;
};

type Block = {
  id: string;
  starts_at: string;
  ends_at: string;
  reason?: string | null;
};

function getTodayIsoDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function parseTimeToMinutes(timeStr: string) {
  const [hh, mm] = timeStr.split(":");
  const hours = Number(hh);
  const minutes = Number(mm);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  return hours * 60 + minutes;
}

export default function AppointmentsPage() {
  const router = useRouter();

  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<AppointmentTab>("agenda");

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIsoDate);

  // Data State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [slots, setSlots] = useState<{ time: string }[]>([]);
  const [rules, setRules] = useState<AvailabilityRule[]>(defaultRules);
  const [blocks, setBlocks] = useState<Block[]>([]);

  // Modal & Loading States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [modalInitialDate, setModalInitialDate] = useState("");
  const [modalInitialTime, setModalInitialTime] = useState("");
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isCreatingAppointment, setIsCreatingAppointment] = useState(false);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [saveRulesSuccess, setSaveRulesSuccess] = useState(false);
  const [saveRulesError, setSaveRulesError] = useState<string | null>(null);
  const [hasUnsavedRules, setHasUnsavedRules] = useState(false);
  const [isSavingBlock, setIsSavingBlock] = useState(false);
  const [isDeletingBlockId, setIsDeletingBlockId] = useState<string | null>(null);
  const [blockSuccessMessage, setBlockSuccessMessage] = useState<string | null>(null);
  const [blockErrorMessage, setBlockErrorMessage] = useState<string | null>(null);
  const [startingSessionPatientId, setStartingSessionPatientId] = useState<string | null>(null);

  // Rules Map
  const rulesByDay = useMemo(() => {
    const map = new Map<number, AvailabilityRule>();
    rules.forEach((rule) => map.set(rule.day_of_week, rule));
    return map;
  }, [rules]);

  // Selected Date Object & Slot State Determinations
  const selectedDateObj = useMemo(() => {
    if (!selectedDate) return new Date();
    const [y, m, d] = selectedDate.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedDate]);

  const isSelectedDateClosed = useMemo(() => {
    const rule = rulesByDay.get(selectedDateObj.getDay());
    return !rule || !rule.is_active;
  }, [rulesByDay, selectedDateObj]);

  const hasPastSlotsOnly = useMemo(() => {
    if (selectedDate !== getTodayIsoDate()) return false;
    const rule = rulesByDay.get(selectedDateObj.getDay());
    if (!rule || !rule.is_active) return false;
    const endMinutes = parseTimeToMinutes(rule.end_time || "17:00") ?? 1020;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return currentMinutes >= endMinutes;
  }, [selectedDate, rulesByDay, selectedDateObj]);

  // Appointments Map for Calendar
  const appointmentsMap = useMemo(() => {
    const map = new Map<
      string,
      { id: string; patientName: string | null; scheduledStart: string; status: string }[]
    >();
    appointments.forEach((appt) => {
      const d = new Date(appt.scheduled_start);
      if (Number.isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      const list = map.get(key) ?? [];
      list.push({
        id: appt.id,
        patientName: appt.patient_name,
        scheduledStart: appt.scheduled_start,
        status: appt.status,
      });
      map.set(key, list);
    });
    return map;
  }, [appointments]);

  // Appointments for Selected Day
  const dayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return appointments
      .filter((appt) => {
        const d = new Date(appt.scheduled_start);
        if (Number.isNaN(d.getTime())) return false;
        return d.toISOString().slice(0, 10) === selectedDate;
      })
      .map((appt) => ({
        id: appt.id,
        patientId: appt.patient_id,
        patientName: appt.patient_name,
        scheduledStart: appt.scheduled_start,
        scheduledEnd: appt.scheduled_end,
        status: appt.status,
        notes: appt.notes,
      }))
      .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime());
  }, [appointments, selectedDate]);

  const isFullyBooked = useMemo(() => {
    if (isSelectedDateClosed || hasPastSlotsOnly) return false;
    return slots.length === 0 && (dayAppointments.length > 0 || blocks.length > 0);
  }, [isSelectedDateClosed, hasPastSlotsOnly, slots.length, dayAppointments.length, blocks.length]);

  const isDayAvailable = (date: Date) => {
    const rule = rulesByDay.get(date.getDay());
    return Boolean(rule?.is_active);
  };

  function normalizeRules(data: AvailabilityRule[]) {
    return weekDays.map((day) => {
      const existing = data.find((r) => r.day_of_week === day.value);
      if (existing) {
        return {
          ...existing,
          start_time: String(existing.start_time || "14:00").slice(0, 5),
          end_time: String(existing.end_time || "17:00").slice(0, 5),
          is_active: Boolean(existing.is_active),
        };
      }
      return defaultRules.find((r) => r.day_of_week === day.value) as AvailabilityRule;
    });
  }

  // Loaders
  async function loadAvailability() {
    try {
      const res = await fetch("/api/availability", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { rules: AvailabilityRule[] };
      setRules(normalizeRules(json.rules ?? []));
    } catch (err) {
      console.error("Erro ao carregar disponibilidade", err);
    }
  }

  async function loadPatients() {
    try {
      const res = await fetch("/api/patients", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { patients: Patient[] };
      setPatients(json.patients ?? []);
    } catch (err) {
      console.error("Erro ao carregar pacientes", err);
    }
  }

  async function loadAppointments() {
    try {
      const res = await fetch("/api/appointments", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { appointments: Appointment[] };
      setAppointments(json.appointments ?? []);
    } catch (err) {
      console.error("Erro ao carregar agendamentos", err);
    }
  }

  async function loadBlocks() {
    try {
      const res = await fetch("/api/availability/blocks", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { blocks: Block[] };
      setBlocks(json.blocks ?? []);
    } catch (err) {
      console.error("Erro ao carregar bloqueios", err);
    }
  }

  async function fetchSlots(dateKey: string) {
    if (!dateKey) return;
    setIsLoadingSlots(true);
    try {
      const res = await fetch(
        `/api/appointments/slots?start_date=${dateKey}&end_date=${dateKey}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const json = (await res.json()) as { slots: { time: string }[] };
      setSlots(json.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }

  useEffect(() => {
    void loadAvailability();
    void loadPatients();
    void loadAppointments();
    void loadBlocks();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      void fetchSlots(selectedDate);
    }
  }, [selectedDate]);

  // Handlers
  const handleSelectDate = (dateKey: string) => {
    setSelectedDate(dateKey);
  };

  const handleOpenNewAppointment = (date?: string, time?: string) => {
    setModalInitialDate(date || selectedDate || getTodayIsoDate());
    setModalInitialTime(time || "");
    setIsCreateModalOpen(true);
  };

  const handleCreateAppointment = async (data: {
    patientId: string;
    date: string;
    time: string;
    notes?: string;
  }) => {
    setIsCreatingAppointment(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patient_id: data.patientId,
          date: data.date,
          time: data.time,
          notes: data.notes,
          source: "app",
        }),
      });

      if (res.ok) {
        setIsCreateModalOpen(false);
        await loadAppointments();
        await fetchSlots(data.date);
        setSelectedDate(data.date);
      }
    } catch (err) {
      console.error("Erro ao criar agendamento", err);
    } finally {
      setIsCreatingAppointment(false);
    }
  };

  const handleStartSession = async (patientId: string) => {
    if (!patientId || startingSessionPatientId) return;
    setStartingSessionPatientId(patientId);
    try {
      const res = await fetch(`/api/patients/${patientId}/sessions`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ consented: true }),
      });

      if (res.ok) {
        const json = (await res.json()) as { session: { id: string } };
        if (json.session?.id) {
          router.push(`/sessions/${json.session.id}`);
          return;
        }
      }
    } catch (err) {
      console.error("Erro ao iniciar sessão", err);
    } finally {
      setStartingSessionPatientId(null);
    }
  };

  // Rule Update & Save
  function updateRule(dayOfWeek: number, patch: Partial<AvailabilityRule>) {
    setHasUnsavedRules(true);
    setSaveRulesSuccess(false);
    setSaveRulesError(null);
    setRules((prev) =>
      prev.map((rule) => {
        if (rule.day_of_week !== dayOfWeek) return rule;
        const updated = { ...rule, ...patch };
        if (patch.is_active && (!updated.start_time || !updated.end_time)) {
          updated.start_time = updated.start_time || "14:00";
          updated.end_time = updated.end_time || "17:00";
        }
        return updated;
      }),
    );
  }

  async function saveRules() {
    setIsSavingRules(true);
    setSaveRulesError(null);
    setSaveRulesSuccess(false);
    try {
      const activeRules = rules.filter((rule) => rule.is_active);
      for (const rule of activeRules) {
        const startM = parseTimeToMinutes(rule.start_time || "14:00") ?? 840;
        const endM = parseTimeToMinutes(rule.end_time || "17:00") ?? 1020;
        if (endM <= startM) {
          const dayName = weekDays.find((d) => d.value === rule.day_of_week)?.label ?? `Dia ${rule.day_of_week}`;
          setSaveRulesError(`Em ${dayName}, o horário final deve ser maior que o horário inicial.`);
          setIsSavingRules(false);
          return;
        }
      }

      const payload = {
        rules: activeRules.map((rule) => ({
          day_of_week: rule.day_of_week,
          start_time: String(rule.start_time?.trim() || "14:00").slice(0, 5),
          end_time: String(rule.end_time?.trim() || "17:00").slice(0, 5),
          is_active: true,
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
        setHasUnsavedRules(false);
        setSaveRulesSuccess(true);
        await fetchSlots(selectedDate);
      } else {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveRulesError(errJson.error || "Erro ao salvar disponibilidade semanal.");
      }
    } catch (err) {
      console.error("Erro ao salvar regras", err);
      setSaveRulesError("Falha na conexão ao salvar disponibilidade.");
    } finally {
      setIsSavingRules(false);
    }
  }

  // Block Create & Delete
  async function createBlock(data: { starts_at: string; ends_at: string; reason?: string }) {
    setIsSavingBlock(true);
    setBlockErrorMessage(null);
    setBlockSuccessMessage(null);
    try {
      const res = await fetch("/api/availability/blocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        await loadBlocks();
        await fetchSlots(selectedDate);
        setBlockSuccessMessage("Bloqueio de agenda cadastrado com sucesso!");
        return true;
      } else {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        setBlockErrorMessage(errJson.error || "Erro ao cadastrar bloqueio.");
        return false;
      }
    } catch (err) {
      console.error("Erro ao criar bloqueio", err);
      setBlockErrorMessage("Falha na conexão ao salvar bloqueio.");
      return false;
    } finally {
      setIsSavingBlock(false);
    }
  }

  async function deleteBlock(id: string) {
    setIsDeletingBlockId(id);
    setBlockErrorMessage(null);
    setBlockSuccessMessage(null);
    try {
      const res = await fetch("/api/availability/blocks", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        await loadBlocks();
        await fetchSlots(selectedDate);
        setBlockSuccessMessage("Bloqueio removido com sucesso.");
        return true;
      } else {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        setBlockErrorMessage(errJson.error || "Erro ao remover bloqueio.");
        return false;
      }
    } catch (err) {
      console.error("Erro ao deletar bloqueio", err);
      setBlockErrorMessage("Falha na conexão ao remover bloqueio.");
      return false;
    } finally {
      setIsDeletingBlockId(null);
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header with Clinical Title & Tabs */}
      <AppointmentsHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenNewAppointment={() => handleOpenNewAppointment()}
      />

      {/* Tab 1: Agenda & Calendário */}
      {activeTab === "agenda" && (
        <div className="grid gap-6 lg:grid-cols-12 items-start">
          {/* Calendar on the Left/Center */}
          <div className="lg:col-span-7 xl:col-span-8">
            <CalendarView
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              appointmentsMap={appointmentsMap}
              isDayAvailable={isDayAvailable}
            />
          </div>

          {/* Daily Schedule & Slots Panel on the Right */}
          <div className="lg:col-span-5 xl:col-span-4">
            <DaySchedulePanel
              selectedDate={selectedDate}
              appointments={dayAppointments}
              availableSlots={slots}
              isLoadingSlots={isLoadingSlots}
              onSelectSlot={(time) => handleOpenNewAppointment(selectedDate, time)}
              onOpenNewAppointmentWithDate={(date, time) =>
                handleOpenNewAppointment(date, time)
              }
              onStartSession={handleStartSession}
              startingSessionPatientId={startingSessionPatientId}
              isDateClosed={isSelectedDateClosed}
              hasPastSlotsOnly={hasPastSlotsOnly}
              isFullyBooked={isFullyBooked}
              hasUnsavedChanges={hasUnsavedRules}
            />
          </div>
        </div>
      )}

      {/* Tab 2: Disponibilidade Semanal */}
      {activeTab === "disponibilidade" && (
        <div className="flex justify-center">
          <WeeklyAvailabilityConfig
            rules={rules}
            onChangeRule={updateRule}
            onSave={saveRules}
            isSaving={isSavingRules}
            saveSuccess={saveRulesSuccess}
            hasUnsavedChanges={hasUnsavedRules}
            errorMessage={saveRulesError}
            className="w-full"
          />
        </div>
      )}

      {/* Tab 3: Bloqueios & Férias */}
      {activeTab === "bloqueios" && (
        <div className="flex justify-center">
          <AvailabilityBlocksManager
            blocks={blocks}
            onCreateBlock={createBlock}
            onDeleteBlock={deleteBlock}
            isSavingBlock={isSavingBlock}
            isDeletingBlockId={isDeletingBlockId}
            errorMessage={blockErrorMessage}
            successMessage={blockSuccessMessage}
            className="w-full"
          />
        </div>
      )}

      {/* Modal for Creating Appointments */}
      <CreateAppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        patients={patients.map((p) => ({ id: p.id, fullName: p.full_name }))}
        availableSlots={slots}
        isLoadingSlots={isLoadingSlots}
        initialDate={modalInitialDate}
        initialTime={modalInitialTime}
        onDateChange={(date) => {
          setSelectedDate(date);
          void fetchSlots(date);
        }}
        onSubmit={handleCreateAppointment}
        isSubmitting={isCreatingAppointment}
        isDateClosed={isSelectedDateClosed}
        hasPastSlotsOnly={hasPastSlotsOnly}
        isFullyBooked={isFullyBooked}
      />
    </div>
  );
}
