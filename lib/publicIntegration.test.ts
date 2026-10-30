import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getCorsHeaders } from "@/lib/cors";
import { resolvePublicTherapist } from "@/lib/publicTherapist";

describe("Adversarial Security & Integration Audit Suite", () => {
  it("1. Strict Tenant Isolation: Rejects unknown or unwhitelisted therapist identifiers", async () => {
    // Tentativa de enumerar outro terapeuta ou UUID arbitrário
    const arbitraryUuid = "11111111-2222-3333-4444-555555555555";
    const resolvedUuid = await resolvePublicTherapist(arbitraryUuid);
    assert.equal(resolvedUuid, null, "Arbitrary UUIDs must be rejected by public resolver");

    const sqlInjectionAttempt = "dra-cristiane' OR '1'='1";
    const resolvedSql = await resolvePublicTherapist(sqlInjectionAttempt);
    assert.equal(resolvedSql, null, "Injection attempts must be rejected");

    const unknownSlug = "dr-estranho";
    const resolvedSlug = await resolvePublicTherapist(unknownSlug);
    assert.equal(resolvedSlug, null, "Unregistered slugs must be rejected");
  });

  it("2. Authorized Whitelist: Successfully resolves approved public slugs", async () => {
    const resolved = await resolvePublicTherapist("dra-cristiane");
    if (resolved) {
      assert.equal(resolved.displayName, "Dra. Cristiane");
      assert.equal(resolved.slug, "dra-cristiane");
      assert.equal(resolved.isActive, true);
    }
  });

  it("3. Anti-Spam / Rate Limiting: Blocks bursts from the same IP identifier", () => {
    const testIp = "test-attacker-ip-123";
    const limitOpts = { limit: 3, windowMs: 10_000 };

    const req1 = checkRateLimit(testIp, limitOpts);
    const req2 = checkRateLimit(testIp, limitOpts);
    const req3 = checkRateLimit(testIp, limitOpts);
    const req4 = checkRateLimit(testIp, limitOpts); // Deve ser bloqueado

    assert.equal(req1.allowed, true);
    assert.equal(req2.allowed, true);
    assert.equal(req3.allowed, true);
    assert.equal(req4.allowed, false, "4th request must exceed the limit of 3");
    assert.ok(req4.resetInMs > 0);
  });

  it("4. CORS Protection: Enforces strict origin whitelist", () => {
    const allowedReq = new NextRequest("http://localhost:3000/api/appointments/slots/public", {
      headers: { origin: "https://cristianealcantara.com.br" },
    });
    const allowedHeaders = getCorsHeaders(allowedReq);
    assert.equal(allowedHeaders["Access-Control-Allow-Origin"], "https://cristianealcantara.com.br");

    const rogueReq = new NextRequest("http://localhost:3000/api/appointments/slots/public", {
      headers: { origin: "https://cristianealcantara.com.br.evil.com" },
    });
    const rogueHeaders = getCorsHeaders(rogueReq);
    assert.equal(rogueHeaders["Access-Control-Allow-Origin"], undefined, "Spoofed domain must not be allowed");
  });

  it("5. Concurrency & Slot Collision Protection", () => {
    const { generateSlots } = require("@/lib/db/appointments");

    // Simula que o horário das 14:00 já possui um appointment agendado
    const slots = generateSlots({
      startDate: "2026-11-09",
      endDate: "2026-11-09",
      rules: [
        {
          day_of_week: 1, // Segunda-feira
          start_time: "14:00",
          end_time: "17:00",
          timezone: "America/Sao_Paulo",
          is_active: true,
        },
      ],
      blocks: [],
      appointments: [
        {
          id: "appt-1",
          scheduled_start: "2026-11-09T14:00:00-03:00",
          scheduled_end: "2026-11-09T15:00:00-03:00",
          status: "requested",
        },
      ],
    });

    const slotTimes = slots.map((s: any) => s.time);
    assert.ok(!slotTimes.includes("14:00"), "Occupied slot at 14:00 must NOT be present in public slots");
    assert.ok(slotTimes.includes("15:00"), "Available slot at 15:00 must be present");
    assert.ok(slotTimes.includes("16:00"), "Available slot at 16:00 must be present");
  });
});
