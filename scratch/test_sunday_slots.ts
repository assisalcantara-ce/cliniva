import { generateSlots, validateSlotWithinRules, type AvailabilityRule } from "../lib/db/appointments";

const sundayRules: AvailabilityRule[] = [
  {
    day_of_week: 0,
    start_time: "14:00",
    end_time: "17:00",
    is_active: true,
    timezone: "America/Sao_Paulo",
  },
];

// 2026-09-27 is a Sunday!
const startDate = "2026-09-27";
const endDate = "2026-09-27";

const slots = generateSlots({
  startDate,
  endDate,
  rules: sundayRules,
  blocks: [],
  appointments: [],
});

console.log("Generated slots for Sunday 2026-09-27:", slots);

const valid1 = validateSlotWithinRules({
  date: "2026-09-27",
  time: "14:00",
  rules: sundayRules,
});
console.log("Is 14:00 valid on 2026-09-27?", valid1);

// What about another future Sunday, e.g. 2026-10-04?
const slotsOct = generateSlots({
  startDate: "2026-10-04",
  endDate: "2026-10-04",
  rules: sundayRules,
  blocks: [],
  appointments: [],
});
console.log("Generated slots for Sunday 2026-10-04:", slotsOct);
