import { notFound } from "next/navigation";
import {
  EVENT_CONTRIBUTABLE_FIELDS,
  formatEventFieldValue,
  getEventBySlugForContribution,
  listSubmissionsForEvent,
  listAllEvents,
  listAllCharacters,
} from "@/lib/event-submissions";
import EventContributionClient from "./EventContributionClient";

export default async function EventContributionPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;

  const event = await getEventBySlugForContribution(key);
  if (!event) notFound();

  const [submissions, allEvents, allCharacters] = await Promise.all([
    listSubmissionsForEvent(event.id),
    listAllEvents(),
    listAllCharacters(),
  ]);

  const currentFieldValues = Object.fromEntries(
    EVENT_CONTRIBUTABLE_FIELDS.map((field) => [
      field,
      formatEventFieldValue(event, field),
    ])
  );

  return (
    <main style={{
      minHeight: "100vh",
      background: "#0d0f1a",
      fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    }}>
      {/* Accent line */}
      <div style={{ height: 2, background: "linear-gradient(90deg, transparent 0%, #3b82f6 40%, #8b5cf6 60%, transparent 100%)" }} />

      {/* Hero */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "36px 20px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{
            width: 52, height: 52, borderRadius: 12, flexShrink: 0,
            background: "linear-gradient(135deg, #1d4ed8, #6d28d9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, boxShadow: "0 0 16px rgba(99,102,241,0.2)",
          }}>
            📅
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(148,163,184,0.45)", marginBottom: 5 }}>
              Event Contribution · Wuthering Waves Fan Project
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", margin: 0, letterSpacing: "-0.3px" }}>
              Improve{" "}
              <span style={{
                background: "linear-gradient(90deg, #60a5fa, #a78bfa)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                {event.title}
              </span>
            </h1>
            <p style={{ fontSize: 13, color: "rgba(148,163,184,0.5)", margin: "4px 0 0" }}>
              Submit a correction or improvement, vote on others — no tech skills needed.
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px 80px" }}>
        <EventContributionClient
          eventKey={event.slug}
          currentOrder={event.order ?? 0}
          currentImportance={event.importance ?? 1}
          submissions={submissions}
          currentFieldValues={currentFieldValues}
          allEvents={allEvents}
          allCharacters={allCharacters}
        />
      </div>
    </main>
  );
}