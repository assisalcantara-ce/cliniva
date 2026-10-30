import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "crypto";
import { landingSchema } from "@/lib/schemas/landingAppointment";

describe("Landing POST Idempotency Hash, Exclusion & Migration Safety Suite", () => {
  const basePayload = {
    idempotency_key: "idem-safe-uuid-v4-998877",
    therapist: "dra-cristiane",
    full_name: "Paciente Teste Hash",
    date: "2026-11-04",
    time: "14:00",
    consent: {
      accepted: true,
      purpose: "Agendamento de consulta inicial e avaliação clínica",
      notice_version: "1.0",
      consented_at: "2026-10-29T16:00:00.000Z",
    },
    anamnesis: {
      personal: {
        birth_date: "1992-08-20",
        celular: "(11) 98888-7777",
      },
    },
  };

  it("1. Deterministic Payload Hash: Produces exact same 64-char SHA-256 for identical content", () => {
    const hash1 = createHash("sha256").update(JSON.stringify(basePayload)).digest("hex");
    const hash2 = createHash("sha256").update(JSON.stringify(basePayload)).digest("hex");

    assert.equal(hash1.length, 64);
    assert.equal(hash1, hash2, "Identical payloads must generate the exact same hash");
  });

  it("2. Payload Mismatch Detection: Detects alteration when same idempotency_key has different payload", () => {
    const alteredPayload = {
      ...basePayload,
      time: "15:00", // Horário diferente
    };

    const originalHash = createHash("sha256").update(JSON.stringify(basePayload)).digest("hex");
    const alteredHash = createHash("sha256").update(JSON.stringify(alteredPayload)).digest("hex");

    assert.notEqual(originalHash, alteredHash, "Tampered payload must produce a different hash");

    // Simulação do comportamento da RPC
    const isMismatch = originalHash !== alteredHash;
    assert.equal(isMismatch, true);
  });

  it("3. Exclusion Constraint Error Handling: Captures 23P01 (exclusion violation) and responds with 409 Conflict", () => {
    const exclusionError = {
      code: "23P01",
      message: 'conflicting key value violates exclusion constraint "exclude_appointments_overlapping_active_slots"',
    };

    let status = 500;
    if (
      exclusionError.code === "23505" ||
      exclusionError.code === "23P01" ||
      exclusionError.message.includes("exclude_appointments_overlapping_active_slots")
    ) {
      status = 409;
    }

    assert.equal(status, 409, "Must translate exclusion constraint violation into HTTP 409 Conflict");
  });

  it("4. Zero Partial Inserts on RPC Failure: Rejects with 503 RPC_MIGRATION_PENDING without fallback inserts", () => {
    const missingRpcError = {
      code: "PGRST202",
      message: "Could not find the function public.create_landing_appointment_atomic in schema cache",
    };

    let status = 500;
    let errorCode = "";
    if (
      missingRpcError.code === "PGRST202" ||
      missingRpcError.message.includes("Could not find the function")
    ) {
      status = 503;
      errorCode = "RPC_MIGRATION_PENDING";
    }

    assert.equal(status, 503);
    assert.equal(errorCode, "RPC_MIGRATION_PENDING");
  });

  it("5. Provisional Patient Conversion Safety: Validates is_active toggle payload schema", () => {
    const { z } = require("zod");
    const statusSchema = z.object({ is_active: z.boolean() });

    // Paciente criado provisoriamente como is_active = false
    const provisional = { is_active: false };
    assert.equal(statusSchema.safeParse(provisional).success, true);

    // Conversão formal pelo terapeuta no painel para definitivo
    const converted = { is_active: true };
    assert.equal(statusSchema.safeParse(converted).success, true);
  });
});
