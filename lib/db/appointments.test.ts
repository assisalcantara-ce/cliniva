import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateSlots,
  validateSlotWithinRules,
  buildSlotRange,
  type AvailabilityRule,
  type AvailabilityBlock,
  type AppointmentRow,
} from "@/lib/db/appointments";

describe("Appointments & Sunday Scheduling Regression Suite", () => {
  const activeSundayRules: AvailabilityRule[] = [
    {
      day_of_week: 0, // Domingo
      start_time: "14:00",
      end_time: "17:00",
      is_active: true,
      timezone: "America/Sao_Paulo",
    },
    {
      day_of_week: 1, // Segunda
      start_time: "14:00",
      end_time: "17:00",
      is_active: true,
      timezone: "America/Sao_Paulo",
    },
  ];

  it("1. Generates correct slots for a future Sunday (2026-10-04)", () => {
    const slots = generateSlots({
      startDate: "2026-10-04",
      endDate: "2026-10-04",
      rules: activeSundayRules,
      blocks: [],
      appointments: [],
    });

    assert.equal(slots.length, 3, "Future Sunday must generate 3 slots (14:00, 15:00, 16:00)");
    assert.deepEqual(
      slots.map((s) => s.time),
      ["14:00", "15:00", "16:00"],
    );
    assert.equal(slots[0].date, "2026-10-04");
  });

  it("2. Filters past slots when scheduling on Sunday with current time before slots (e.g. 10:00 BRT)", () => {
    // 10:00 BRT on 2026-09-27 = 13:00 UTC
    const now10am = new Date("2026-09-27T10:00:00-03:00");

    const slots = generateSlots({
      startDate: "2026-09-27",
      endDate: "2026-09-27",
      rules: activeSundayRules,
      blocks: [],
      appointments: [],
      now: now10am,
    });

    assert.equal(slots.length, 3, "All 3 slots should be available before 14:00");
    assert.deepEqual(
      slots.map((s) => s.time),
      ["14:00", "15:00", "16:00"],
    );
  });

  it("3. Filters past slots when current time is during the Sunday schedule (e.g. 15:30 BRT)", () => {
    // 15:30 BRT on 2026-09-27 = 18:30 UTC
    const now1530 = new Date("2026-09-27T15:30:00-03:00");

    const slots = generateSlots({
      startDate: "2026-09-27",
      endDate: "2026-09-27",
      rules: activeSundayRules,
      blocks: [],
      appointments: [],
      now: now1530,
    });

    assert.equal(slots.length, 1, "Only 16:00 slot should remain at 15:30");
    assert.equal(slots[0].time, "16:00");
  });

  it("4. Filters all slots when current time is after the Sunday schedule (e.g. 18:00 BRT)", () => {
    // 18:00 BRT on 2026-09-27 = 21:00 UTC
    const now1800 = new Date("2026-09-27T18:00:00-03:00");

    const slots = generateSlots({
      startDate: "2026-09-27",
      endDate: "2026-09-27",
      rules: activeSundayRules,
      blocks: [],
      appointments: [],
      now: now1800,
    });

    assert.equal(slots.length, 0, "No slots should remain after 17:00");
  });

  it("5. Does NOT abort loop when first slot has an existing appointment (regression for continue bug)", () => {
    const existingAppointments: AppointmentRow[] = [
      {
        id: "appt-1",
        scheduled_start: "2026-10-04T14:00:00-03:00",
        scheduled_end: "2026-10-04T15:00:00-03:00",
        status: "confirmed",
      },
    ];

    const slots = generateSlots({
      startDate: "2026-10-04",
      endDate: "2026-10-04",
      rules: activeSundayRules,
      blocks: [],
      appointments: existingAppointments,
    });

    assert.equal(slots.length, 2, "Should preserve 15:00 and 16:00 slots despite 14:00 appointment");
    assert.deepEqual(
      slots.map((s) => s.time),
      ["15:00", "16:00"],
    );
  });

  it("6. Does NOT abort loop when middle slot has an availability block", () => {
    const blocks: AvailabilityBlock[] = [
      {
        id: "block-1",
        starts_at: "2026-10-04T15:00:00-03:00",
        ends_at: "2026-10-04T16:00:00-03:00",
      },
    ];

    const slots = generateSlots({
      startDate: "2026-10-04",
      endDate: "2026-10-04",
      rules: activeSundayRules,
      blocks,
      appointments: [],
    });

    assert.equal(slots.length, 2, "Should preserve 14:00 and 16:00 slots despite 15:00 block");
    assert.deepEqual(
      slots.map((s) => s.time),
      ["14:00", "16:00"],
    );
  });

  it("7. Validates slots within Sunday rules via validateSlotWithinRules", () => {
    const valid14 = validateSlotWithinRules({
      date: "2026-10-04",
      time: "14:00",
      rules: activeSundayRules,
    });
    const valid16 = validateSlotWithinRules({
      date: "2026-10-04",
      time: "16:00",
      rules: activeSundayRules,
    });
    const invalid17 = validateSlotWithinRules({
      date: "2026-10-04",
      time: "17:00",
      rules: activeSundayRules,
    });
    const invalid13 = validateSlotWithinRules({
      date: "2026-10-04",
      time: "13:00",
      rules: activeSundayRules,
    });

    assert.equal(valid14, true, "14:00 is valid");
    assert.equal(valid16, true, "16:00 is valid");
    assert.equal(invalid17, false, "17:00 is invalid (slot would end at 18:00)");
    assert.equal(invalid13, false, "13:00 is invalid (before start 14:00)");
  });

  it("8. Builds slot range accurately with timezone America/Sao_Paulo", () => {
    const range = buildSlotRange({
      date: "2026-10-04",
      time: "14:00",
      timezone: "America/Sao_Paulo",
    });

    assert.equal(range.start.toISOString(), "2026-10-04T17:00:00.000Z");
    assert.equal(range.end.toISOString(), "2026-10-04T18:00:00.000Z");
  });

  it("9. Returns 0 slots when Sunday is inactive in rules", () => {
    const inactiveSundayRules: AvailabilityRule[] = [
      {
        day_of_week: 0,
        start_time: "14:00",
        end_time: "17:00",
        is_active: false,
        timezone: "America/Sao_Paulo",
      },
    ];

    const slots = generateSlots({
      startDate: "2026-10-04",
      endDate: "2026-10-04",
      rules: inactiveSundayRules,
      blocks: [],
      appointments: [],
    });

    assert.equal(slots.length, 0, "No slots when Sunday is inactive");
  });
});
