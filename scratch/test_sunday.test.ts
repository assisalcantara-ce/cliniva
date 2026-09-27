import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateSlots, validateSlotWithinRules, type AvailabilityRule } from "@/lib/db/appointments";

describe("Sunday Slot Generation Test", () => {
  it("generates slots for Sunday 2026-09-27 and future Sundays", () => {
    const sundayRules: AvailabilityRule[] = [
      {
        day_of_week: 0,
        start_time: "14:00",
        end_time: "17:00",
        is_active: true,
        timezone: "America/Sao_Paulo",
      },
    ];

    const slots = generateSlots({
      startDate: "2026-09-27",
      endDate: "2026-09-27",
      rules: sundayRules,
      blocks: [],
      appointments: [],
    });

    console.log("SLOTS on 2026-09-27:", JSON.stringify(slots));
    assert.equal(slots.length, 3, "Should have 3 slots (14:00, 15:00, 16:00)");
  });
});
