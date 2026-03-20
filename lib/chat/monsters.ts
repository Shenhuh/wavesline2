// lib/chat/monsters.ts

import { createAdminClient } from "@/lib/supabase/admin";

export type MonsterRow = {
  id: string;
  name: string;
  element: string | null;
  location: string | null;
  lore: string | null;
  class: string | null;
};

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/['"`’]/g, "")
    .replace(/[—–-]/g, " ")
    .replace(/[^a-z0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeLike(value: string) {
  return value.replace(/[%_,]/g, " ").replace(/\s+/g, " ").trim();
}

function extractSearchTerms(message: string): string[] {
  const normalized = normalizeText(message);

  if (!normalized) return [];

  const stopWords = new Set([
    "a",
    "an",
    "and",
    "are",
    "about",
    "also",
    "am",
    "as",
    "at",
    "be",
    "by",
    "can",
    "could",
    "did",
    "do",
    "does",
    "for",
    "from",
    "give",
    "how",
    "i",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "just",
    "know",
    "me",
    "more",
    "my",
    "of",
    "on",
    "or",
    "please",
    "tell",
    "than",
    "that",
    "the",
    "their",
    "them",
    "there",
    "these",
    "they",
    "this",
    "to",
    "what",
    "where",
    "which",
    "who",
    "why",
    "you",
    "your",
  ]);

  const words = normalized
    .split(" ")
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  const phrases: string[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    const pair = `${words[i]} ${words[i + 1]}`;
    if (pair.length >= 7) phrases.push(pair);
  }

  const all = [...phrases, ...words]
    .map(escapeLike)
    .filter(Boolean);

  const unique: string[] = [];
  for (const item of all) {
    if (!unique.includes(item)) unique.push(item);
  }

  return unique.slice(0, 5);
}

export async function searchRelevantMonsters(args: {
  message: string;
  limit?: number;
}): Promise<MonsterRow[]> {
  const { message, limit = 5 } = args;
  const supabase = createAdminClient();

  const terms = extractSearchTerms(message);

  if (terms.length === 0) {
    return [];
  }

  const orFilters: string[] = [];
  for (const term of terms) {
    orFilters.push(`name.ilike.%${term}%`);
    orFilters.push(`lore.ilike.%${term}%`);
    orFilters.push(`location.ilike.%${term}%`);
    orFilters.push(`class.ilike.%${term}%`);
    orFilters.push(`element.ilike.%${term}%`);
  }

  const { data, error } = await supabase
    .from("monsters")
    .select("id, name, element, location, lore, class")
    .or(orFilters.join(","))
    .limit(limit);

  if (error) {
    console.error("[monster-search-error]", {
      message,
      terms,
      orFilters,
      error: error.message,
    });
    return [];
  }

  const rows = (data ?? []) as MonsterRow[];

  const scored = rows
    .map((monster) => {
      const haystack = normalizeText(
        [
          monster.name ?? "",
          monster.element ?? "",
          monster.location ?? "",
          monster.class ?? "",
          monster.lore ?? "",
        ].join(" ")
      );

      let score = 0;
      for (const term of terms) {
        if (haystack.includes(normalizeText(term))) score += 1;
      }

      if (normalizeText(message).includes(normalizeText(monster.name ?? ""))) {
        score += 5;
      }

      return { monster, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.monster);

  return scored.slice(0, limit);
}

export function buildMonsterContextBlock(
  monsters: MonsterRow[],
  message: string
): string {
  if (!monsters.length) return "";

  const lines: string[] = [];
  lines.push("Relevant monster data:");

  for (const monster of monsters) {
    const parts = [
      `Name: ${monster.name}`,
      monster.class ? `Class: ${monster.class}` : null,
      monster.element ? `Element: ${monster.element}` : null,
      monster.location ? `Location: ${monster.location}` : null,
      monster.lore ? `Lore: ${monster.lore}` : null,
    ].filter(Boolean);

    lines.push(parts.join(" | "));
  }

  lines.push(
    "Only use this monster data if it matches the user's actual question. Do not switch to another monster."
  );

  return lines.join("\n");
}