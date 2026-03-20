import { NextResponse } from "next/server";
import { createFieldSubmission } from "@/lib/character-submissions";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    await createFieldSubmission({
      characterKey: String(body.characterKey ?? "").trim(),
      fieldName: String(body.fieldName ?? "").trim(),
      proposedValue: String(body.proposedValue ?? ""),
      reason: String(body.reason ?? ""),
      submittedByName: String(body.submittedByName ?? ""),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to submit.",
      },
      { status: 400 }
    );
  }
}