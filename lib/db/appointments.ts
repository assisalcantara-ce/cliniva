import "server-only";

const DEFAULT_TIMEZONE = "America/Sao_Paulo";
const SLOT_MINUTES = 60;

export type AvailabilityRule = {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  timezone?: string | null;
  is_active?: boolean;
};

export type AvailabilityBlock = {
  id: string;
  starts_at: string;
  ends_at: string;
};

export type AppointmentRow = {
  id: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
};

export type SlotResult = {
  date: string;
  time: string;
  start: string;
  end: string;
};

function ensureTimezone(timezone?: string | null) {
  if (!timezone || timezone === DEFAULT_TIMEZONE) return DEFAULT_TIMEZONE;
  throw new Error("Timezone not supported in MVP");
}

function parseTimeToMinutes(timeStr: string) {
  const [hh, mm] = timeStr.split(":");
  const hours = Number(hh);
  const minutes = Number(mm);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesToTimeString(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function buildDateTime(dateStr: string, timeStr: string, timezone?: string | null) {
  const tz = ensureTimezone(timezone);
  if (tz !== DEFAULT_TIMEZONE) {
    throw new Error("Timezone not supported in MVP");
  }
  return new Date(`${dateStr}T${timeStr}:00-03:00`);
}

function buildDateOnly(dateStr: string) {
  return new Date(`${dateStr}T00:00:00-03:00`);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date) {
  return startA < endB && endA > startB;
}

export function generateSlots(params: {
  startDate: string;
  endDate: string;
  rules: AvailabilityRule[];
  blocks: AvailabilityBlock[];
  appointments: AppointmentRow[];
}) {
  const { startDate, endDate, rules, blocks, appointments } = params;
  const start = buildDateOnly(startDate);
  const end = buildDateOnly(endDate);

  const slots: SlotResult[] = [];
  const dayMs = 24 * 60 * 60 * 1000;

  for (let t = start.getTime(); t <= end.getTime(); t += dayMs) {
    const current = new Date(t);
    const dow = current.getUTCDay();
    const dayStr = current.toISOString().slice(0, 10);

    const dayRules = rules.filter(
      (rule) => rule.is_active !== false && rule.day_of_week === dow,
    );

    dayRules.forEach((rule) => {
      const startMinutes = parseTimeToMinutes(rule.start_time);
      const endMinutes = parseTimeToMinutes(rule.end_time);
      if (startMinutes === null || endMinutes === null) return;
      if (endMinutes <= startMinutes) return;

      for (let m = startMinutes; m + SLOT_MINUTES <= endMinutes; m += SLOT_MINUTES) {
        const timeStr = minutesToTimeString(m);
        const slotStart = buildDateTime(dayStr, timeStr, rule.timezone);
        const slotEnd = addMinutes(slotStart, SLOT_MINUTES);

        const hasBlock = blocks.some((block) => {
          const blockStart = new Date(block.starts_at);
          const blockEnd = new Date(block.ends_at);
          return overlaps(slotStart, slotEnd, blockStart, blockEnd);
        });
        if (hasBlock) return;

        const hasAppointment = appointments.some((appt) => {
          if (appt.status === "cancelled") return false;
          const apptStart = new Date(appt.scheduled_start);
          const apptEnd = new Date(appt.scheduled_end);
          return overlaps(slotStart, slotEnd, apptStart, apptEnd);
        });
        if (hasAppointment) return;

        slots.push({
          date: dayStr,
          time: timeStr,
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
        });
      }
    });
  }

  return slots;
}

export function validateSlotWithinRules(params: {
  date: string;
  time: string;
  rules: AvailabilityRule[];
}) {
  const { date, time, rules } = params;
  const dateObj = buildDateOnly(date);
  const dow = dateObj.getUTCDay();

  const rule = rules.find(
    (r) => r.is_active !== false && r.day_of_week === dow,
  );
  if (!rule) return false;

  const startMinutes = parseTimeToMinutes(rule.start_time);
  const endMinutes = parseTimeToMinutes(rule.end_time);
  const slotMinutes = parseTimeToMinutes(time);
  if (startMinutes === null || endMinutes === null || slotMinutes === null) return false;

  return slotMinutes >= startMinutes && slotMinutes + SLOT_MINUTES <= endMinutes;
}

export function buildSlotRange(params: {
  date: string;
  time: string;
  timezone?: string | null;
}) {
  const { date, time, timezone } = params;
  const start = buildDateTime(date, time, timezone);
  const end = addMinutes(start, SLOT_MINUTES);
  return { start, end };
}
