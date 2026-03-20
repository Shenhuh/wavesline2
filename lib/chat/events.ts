// lib/chat/events.ts

import { createAdminClient } from "@/lib/supabase/admin";

export type ActiveGameEvent = {
  id: string;
  title: string;
  slug: string;
  order: number;
  importance: number;
  details: string | null;
  involved_characters: string[];
};

function isCharacterSpecific(event: ActiveGameEvent, characterKey: string) {
  const keys = Array.isArray(event.involved_characters)
    ? event.involved_characters.map((entry) => {
        const raw = String(entry ?? "").trim();
        const keyPart = raw.split("—")[0]?.split("-")[0]?.trim();
        return keyPart || raw;
      })
    : [];

  return keys.includes(characterKey);
}

export async function getRelevantEventsForCharacter(args: {
  characterKey: string;
  limit?: number;
}): Promise<ActiveGameEvent[]> {
  const { characterKey, limit = 5 } = args;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("game_events")
    .select("id, title, slug, order, importance, details, involved_characters")
    .order("order", { ascending: true })
    .limit(50);

  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as Partial<ActiveGameEvent>[]).map((event) => ({
    id: String(event.id ?? ""),
    title: String(event.title ?? ""),
    slug: String(event.slug ?? ""),
    order: Number.isFinite(Number(event.order)) ? Number(event.order) : 0,
    importance: Number.isFinite(Number(event.importance))
      ? Number(event.importance)
      : 1,
    details: event.details ? String(event.details) : null,
    involved_characters: Array.isArray(event.involved_characters)
      ? event.involved_characters.map((x) => String(x))
      : [],
  }));

  const relevant = rows.filter((event) => {
    const keys = Array.isArray(event.involved_characters)
      ? event.involved_characters.map((entry) => {
          const raw = String(entry ?? "").trim();
          const keyPart = raw.split("—")[0]?.split("-")[0]?.trim();
          return keyPart || raw;
        })
      : [];

    return keys.length === 0 || keys.includes(characterKey);
  });

  relevant.sort((a, b) => {
    const aSpecific = isCharacterSpecific(a, characterKey) ? 1 : 0;
    const bSpecific = isCharacterSpecific(b, characterKey) ? 1 : 0;
    if (bSpecific !== aSpecific) return bSpecific - aSpecific;

    if (b.importance !== a.importance) return b.importance - a.importance;

    return a.order - b.order;
  });

  return relevant.slice(0, limit);
}

export function buildEventContextBlock(events: ActiveGameEvent[]) {
  if (!events.length) return "";

  return [
    "CURRENT WORLD EVENTS",
    ...events.map((event, i) => {
      const involved =
        Array.isArray(event.involved_characters) &&
        event.involved_characters.length > 0
          ? `Involved Characters: ${event.involved_characters.join(", ")}`
          : "";

      const parts = [
        `${i + 1}. ${event.title}`,
        `Slug: ${event.slug}`,
        `Order: ${event.order}`,
        `Importance: ${event.importance}`,
        event.details ? `Details: ${event.details}` : "",
        involved,
      ].filter(Boolean);

      return parts.join(" | ");
    }),
    "Prioritize events that directly involve the current character.",
    "Let these events subtly influence what the character knows, references, worries about, or prioritizes.",
    "Do not force event mentions if the current message does not benefit from it.",
  ].join("\n");
}