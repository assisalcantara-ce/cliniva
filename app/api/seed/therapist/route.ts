import { NextResponse } from "next/server";

import { getOrCreateTherapist } from "@/lib/db/therapist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const therapist = await getOrCreateTherapist({
      displayName: "Dra. Cristiane",
    });
    return NextResponse.json({ therapist }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
