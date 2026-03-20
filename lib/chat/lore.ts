import "server-only";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { getCharacterConfig } from "@/lib/chat/characters";

type GenericRow = Record<string, unknown>;

export type LoreDebugInfo = {
  route: "model";
  matched: {
    loreEntryKeys: string[];
    factionSlugs: string[];
    regionSlugs: string[];
    staticMonsterNames: string[];
    exactMonsterNames: string[];
  };
  contextPreview: string;
};

function cleanValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function serializeRow(row: GenericRow) {
  const ignoredKeys = new Set(["id", "created_at", "updated_at"]);

  const parts = Object.entries(row)
    .filter(([key, value]) => !ignoredKeys.has(key) && value !== null && value !== "")
    .map(([key, value]) => {
      const formattedKey = key.replace(/_/g, " ");
      return `${formattedKey}: ${cleanValue(value)}`;
    })
    .filter((part) => part.trim().length > 0);

  return parts.join("\n");
}

function section(title: string, rows: GenericRow[]) {
  if (!rows.length) return "";

  const body = rows
    .map((row, index) => {
      const serialized = serializeRow(row);
      return serialized ? `[${index + 1}]\n${serialized}` : "";
    })
    .filter(Boolean)
    .join("\n\n");

  if (!body) return "";

  return `### ${title}\n${body}`;
}

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

function dedupeRowsByField(rows: GenericRow[], field: string) {
  return rows.filter((row, index, arr) => {
    const current = cleanValue(row[field]);
    return arr.findIndex((item) => cleanValue(item[field]) === current) === index;
  });
}

async function fetchRowsBySlug(table: string, slugs: readonly string[]) {
  if (!slugs.length) return [];

  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .in("slug", [...slugs]);

  if (error) {
    console.error(`Failed to fetch ${table} by slug:`, error);
    return [];
  }

  return (data ?? []) as GenericRow[];
}

async function fetchRowsByName(table: string, names: readonly string[]) {
  if (!names.length) return [];

  const { data, error } = await supabaseAdmin
    .from(table)
    .select("*")
    .in("name", [...names]);

  if (error) {
    console.error(`Failed to fetch ${table} by name:`, error);
    return [];
  }

  return (data ?? []) as GenericRow[];
}

async function fetchLoreEntries(keys: readonly string[]) {
  if (!keys.length) return [];

  const possibleColumns = ["key", "slug", "entry_key", "name", "title"] as const;

  for (const column of possibleColumns) {
    const { data, error } = await supabaseAdmin
      .from("lore_entries")
      .select("*")
      .in(column, [...keys]);

    if (!error && data) {
      return data as GenericRow[];
    }
  }

  return [];
}

function detectLoreEntryKeys(message: string) {
  const text = normalize(message);
  const keys: string[] = [];

  if (
    includesAny(text, [
      "world",
      "solaris",
      "solaris-3",
      "solar 3",
      "lament",
    ])
  ) {
    keys.push("WORLD_LORE");
  }

  if (
    includesAny(text, [
      "creature",
      "creatures",
      "monster",
      "monsters",
      "enemy",
      "enemies",
      "tacet",
      "discord",
      "discords",
    ])
  ) {
    keys.push("CREATURES_LORE");
  }

  return keys;
}

function detectRegionSlugs(message: string) {
  const text = normalize(message);
  const slugs: string[] = [];

  const regionMap: Record<string, string> = {
    huanglong: "huanglong",
    rinascita: "rinascita",
    "new federation": "new-federation",
    federation: "new-federation",
    "lahai-roi": "lahai-roi",
    lahai: "lahai-roi",
    roi: "lahai-roi",
    "black shores": "black-shores",
  };

  for (const [keyword, slug] of Object.entries(regionMap)) {
    if (text.includes(keyword)) {
      slugs.push(slug);
    }
  }

  return [...new Set(slugs)];
}

function detectFactionSlugs(message: string) {
  const text = normalize(message);
  const slugs: string[] = [];

  const factionMap: Record<string, string> = {
    fractsidus: "fractsidus",
    "order of the deep": "order-of-the-deep",
    fisalia: "fisalia-family",
    "fisalia family": "fisalia-family",
    "midnight rangers": "midnight-rangers",
    montelli: "montelli-family",
    "montelli family": "montelli-family",
    "black shores": "black-shores",
  };

  for (const [keyword, slug] of Object.entries(factionMap)) {
    if (text.includes(keyword)) {
      slugs.push(slug);
    }
  }

  return [...new Set(slugs)];
}

function detectMonsterIntent(message: string) {
  const text = normalize(message);

  return {
    asksAboutMonsters: includesAny(text, [
      "monster",
      "monsters",
      "enemy",
      "enemies",
      "tacet discord",
      "tacet discords",
      "discord",
      "discords",
      "creature",
      "creatures",
    ]),
    asksToName: includesAny(text, [
      "name",
      "list",
      "which",
      "what monsters",
      "what enemies",
      "can you name",
      "tell me some",
      "show me",
      "examples",
      "one monster",
      "some monsters",
    ]),
  };
}

function regionSlugToDisplayName(slug: string) {
  switch (slug) {
    case "huanglong":
      return "Huanglong";
    case "rinascita":
      return "Rinascita";
    case "new-federation":
      return "New Federation";
    case "lahai-roi":
      return "Lahai-Roi";
    case "black-shores":
      return "Black Shores";
    default:
      return slug;
  }
}

async function fetchExactMonstersForRegions(regionSlugs: string[]) {
  if (!regionSlugs.length) return [];

  const regionNames = regionSlugs.map(regionSlugToDisplayName);
  const orFilters = regionNames.map((name) => `location.ilike.%${name}%`).join(",");

  const { data, error } = await supabaseAdmin
    .from("monsters")
    .select("name, element, location, lore, class")
    .or(orFilters)
    .order("name", { ascending: true })
    .limit(20);

  if (error) {
    console.error("Failed to fetch exact monsters by region:", error);
    return [];
  }

  return (data ?? []) as GenericRow[];
}

async function fetchExactMonstersByNameHints(message: string) {
  const text = normalize(message);

  const { data, error } = await supabaseAdmin
    .from("monsters")
    .select("name, element, location, lore, class")
    .limit(100);

  if (error) {
    console.error("Failed to prefetch monsters for name hints:", error);
    return [];
  }

  const rows = (data ?? []) as GenericRow[];

  return rows.filter((row) => {
    const name = normalize(cleanValue(row.name));
    return name.length > 0 && text.includes(name);
  });
}

export async function getLoreContextForCharacter(
  characterId: string,
  userMessage: string
): Promise<{ context: string; debug: LoreDebugInfo }> {
  const character = getCharacterConfig(characterId);

  const dynamicLoreEntryKeys = detectLoreEntryKeys(userMessage);
  const dynamicRegionSlugs = detectRegionSlugs(userMessage);
  const dynamicFactionSlugs = detectFactionSlugs(userMessage);
  const monsterIntent = detectMonsterIntent(userMessage);

  const mergedLoreEntryKeys = [
    ...new Set([...character.loreSources.loreEntries, ...dynamicLoreEntryKeys]),
  ];

  const mergedRegionSlugs = [
    ...new Set([...character.loreSources.regions, ...dynamicRegionSlugs]),
  ];

  const mergedFactionSlugs = [
    ...new Set([...character.loreSources.factions, ...dynamicFactionSlugs]),
  ];

  const shouldUseExactMonsterRetrieval =
    monsterIntent.asksAboutMonsters &&
    (monsterIntent.asksToName || mergedRegionSlugs.length > 0);

  const [
    loreEntries,
    factions,
    regions,
    staticMonsters,
    exactMonstersForRegions,
    exactMonstersByName,
  ] = await Promise.all([
    fetchLoreEntries(mergedLoreEntryKeys),
    fetchRowsBySlug("factions", mergedFactionSlugs),
    fetchRowsBySlug("regions", mergedRegionSlugs),
    fetchRowsByName("monsters", character.loreSources.monsters),
    shouldUseExactMonsterRetrieval
      ? fetchExactMonstersForRegions(mergedRegionSlugs)
      : Promise.resolve([] as GenericRow[]),
    monsterIntent.asksAboutMonsters
      ? fetchExactMonstersByNameHints(userMessage)
      : Promise.resolve([] as GenericRow[]),
  ]);

  const mergedMonsters = dedupeRowsByField(
    [...staticMonsters, ...exactMonstersForRegions, ...exactMonstersByName],
    "name"
  );

  const sections = [
    section("Lore Entries", loreEntries),
    section("Faction Lore", factions),
    section("Region Lore", regions),
    section("Monster Lore", mergedMonsters),
  ].filter(Boolean);

  const context = !sections.length
    ? ""
    : `
Use the following lore context as grounding information.

Rules:
- Treat this as factual world knowledge.
- Use it naturally in responses.
- Only use details that appear in this context.
- If the context does not contain the answer, say: "I don't have enough information about that."
- Do not invent names, locations, monsters, factions, or lore details.
- Do not mention hidden lore, databases, retrieval, or system context.

${sections.join("\n\n")}
`.trim();

  return {
    context,
    debug: {
      route: "model",
      matched: {
        loreEntryKeys: mergedLoreEntryKeys,
        factionSlugs: mergedFactionSlugs,
        regionSlugs: mergedRegionSlugs,
        staticMonsterNames: staticMonsters.map((row) => cleanValue(row.name)),
        exactMonsterNames: mergedMonsters.map((row) => cleanValue(row.name)),
      },
      contextPreview: context.slice(0, 4000),
    },
  };
}