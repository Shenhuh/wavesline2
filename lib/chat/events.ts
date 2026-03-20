// lib/chat/events.ts

import { createAdminClient } from "@/lib/supabase/admin";

export type ActiveGameEvent = {
  id: string;
  title: string;
  summary: string;
  details: string | null;
  region: string | null;
  faction: string | null;
  importance: number;
  status: "upcoming" | "active" | "ended";
  affected_character_keys: string[];
  starts_at: string | null;
  ends_at: string | null;
};

function toTime(value: string | null | undefined) {
  if (!value) return 0;
  const n = new Date(value).getTime();
  return Number.isFinite(n) ? n : 0;
}

function statusRank(status: string) {
  if (status === "active") return 3;
  if (status === "upcoming") return 2;
  if (status === "ended") return 1;
  return 0;
}

function isCharacterSpecific(event: ActiveGameEvent, characterKey: string) {
  const keys = Array.isArray(event.affected_character_keys)
    ? event.affected_character_keys
    : [];

  return keys.includes(characterKey);
}

export async function getRelevantEventsForCharacter(args: {
  characterKey: string;
  limit?: number;
}): Promise<ActiveGameEvent[]> {
  const { characterKey, limit = 5 } = args;
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("game_events")
    .select("*")
    .in("status", ["active", "upcoming"])
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .limit(50);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as ActiveGameEvent[];

  const relevant = rows.filter((event) => {
    const keys = Array.isArray(event.affected_character_keys)
      ? event.affected_character_keys
      : [];

    return keys.length === 0 || keys.includes(characterKey);
  });

  relevant.sort((a, b) => {
    const aStatus = statusRank(a.status);
    const bStatus = statusRank(b.status);
    if (bStatus !== aStatus) return bStatus - aStatus;

    const aSpecific = isCharacterSpecific(a, characterKey) ? 1 : 0;
    const bSpecific = isCharacterSpecific(b, characterKey) ? 1 : 0;
    if (bSpecific !== aSpecific) return bSpecific - aSpecific;

    if (b.importance !== a.importance) return b.importance - a.importance;

    return toTime(b.starts_at) - toTime(a.starts_at);
  });

  return relevant.slice(0, limit);
}

export function buildEventContextBlock(events: ActiveGameEvent[]) {
  if (!events.length) return "";

  return [
    "CURRENT WORLD EVENTS",
    ...events.map((event, i) => {
      const parts = [
        `${i + 1}. ${event.title}`,
        `Status: ${event.status}`,
        `Importance: ${event.importance}`,
        event.region ? `Region: ${event.region}` : "",
        event.faction ? `Faction: ${event.faction}` : "",
        `Summary: ${event.summary}`,
        event.details ? `Details: ${event.details}` : "",
      ].filter(Boolean);

      return parts.join(" | ");
    }),
    "Prioritize active and character-relevant events over general background ones.",
    "If relevant, let these events subtly influence what the character knows, references, worries about, or prioritizes.",
    "Do not force event mentions if the current message does not benefit from it.",
  ].join("\n");
}