import { NextResponse } from "next/server";
import {
  EVENT_CONTRIBUTABLE_FIELDS,
  createEventFieldSubmission,
  formatEventFieldValue,
  getEventBySlugForContribution,
  type EventContributableField,
} from "@/lib/event-submissions";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const eventKey = String(body.eventKey ?? "").trim().toLowerCase();
    const fieldName = String(body.fieldName ?? "").trim() as EventContributableField;
    const proposedValue = String(body.proposedValue ?? "").trim();
    const reason = String(body.reason ?? "").trim();
    const submittedByName = String(body.submittedByName ?? "").trim();

    if (!eventKey || !proposedValue) {
      return NextResponse.json(
        { error: "Missing event slug or proposed value." },
        { status: 400 }
      );
    }

    if (!EVENT_CONTRIBUTABLE_FIELDS.includes(fieldName)) {
      return NextResponse.json(
        { error: "Invalid field name." },
        { status: 400 }
      );
    }

    const event = await getEventBySlugForContribution(eventKey);
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const currentValue = formatEventFieldValue(event, fieldName);

    await createEventFieldSubmission({
      eventId: event.id,
      fieldName,
      currentValue,
      proposedValue,
      reason,
      submittedByName,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}