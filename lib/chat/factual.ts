import "server-only";

import { supabaseAdmin } from "@/lib/supabase-admin";

type MonsterRow = {
  name: string;
  element: string | null;
  location: string | null;
  lore: string | null;
  class: string | null;
};

type RegionRow = {
  name: string;
  overview: string | null;
  culture: string | null;
  governance: string | null;
  sentinel: string | null;
  threnodian: string | null;
};

type FactionRow = {
  name: string;
  ideology: string | null;
  members: string | null;
};

type LoreEntryRow = {
  key?: string | null;
  content?: string | null;
};

export type FactualAnswerDebug = {
  route: "factual";
  kind: "monster_list" | "region" | "faction" | "lore_entry";
  matched: {
    region?: string | null;
    faction?: string | null;
    loreEntryKey?: string | null;
    monsterNames?: string[];
    requestedCount?: number | null;
  };
  facts: string;
  reply?: string;
};

export type FactualAnswerResult =
  | {
      answered: false;
      debug: {
        route: "factual";
        matched: {
          region?: string | null;
          faction?: string | null;
          loreEntryKey?: string | null;
        };
      };
    }
  | {
      answered: true;
      kind: "monster_list" | "region" | "faction" | "lore_entry";
      facts: string;
      directReply?: string;
      debug: FactualAnswerDebug;
    };

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

function trimMarkdownNoise(text: string) {
  return text
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function detectRegion(message: string) {
  const text = normalize(message);

  const map: Record<string, string> = {
    huanglong: "Huanglong",
    rinascita: "Rinascita",
    "new federation": "New Federation",
    federation: "New Federation",
    "lahai-roi": "Lahai-Roi",
    lahai: "Lahai-Roi",
    roi: "Lahai-Roi",
    "black shores": "Black Shores",
  };

  for (const [keyword, regionName] of Object.entries(map)) {
    if (text.includes(keyword)) {
      return regionName;
    }
  }

  return null;
}

function detectFaction(message: string) {
  const text = normalize(message);

  const map: Record<string, string> = {
    fractsidus: "Fractsidus",
    "order of the deep": "Order of the Deep",
    "fisalia family": "Fisalia Family",
    fisalia: "Fisalia Family",
    "midnight rangers": "Midnight Rangers",
    "montelli family": "Montelli Family",
    montelli: "Montelli Family",
    "black shores": "Black Shores",
  };

  for (const [keyword, factionName] of Object.entries(map)) {
    if (text.includes(keyword)) {
      return factionName;
    }
  }

  return null;
}

function detectLoreEntryKey(message: string) {
  const text = normalize(message);

  if (
    includesAny(text, [
      "tacet discord",
      "tacet discords",
      "creature",
      "creatures",
      "discord",
      "discords",
    ])
  ) {
    return "CREATURES_LORE";
  }

  if (
    includesAny(text, [
      "world",
      "solaris",
      "solaris-3",
      "solar 3",
      "lament",
    ])
  ) {
    return "WORLD_LORE";
  }

  return null;
}

function detectRequestedMonsterCount(message: string) {
  const text = normalize(message);

  const numericMatch = text.match(/\b(\d+)\b/);
  if (numericMatch) {
    const count = Number(numericMatch[1]);
    if (Number.isFinite(count) && count > 0) {
      return Math.min(count, 10);
    }
  }

  const wordMap: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };

  for (const [word, value] of Object.entries(wordMap)) {
    if (text.includes(word)) {
      return value;
    }
  }

  if (
    includesAny(text, [
      "some",
      "several",
      "few",
      "examples",
      "tell me some",
      "show me",
    ])
  ) {
    return 5;
  }

  return null;
}

function isMonsterQuestion(message: string) {
  const text = normalize(message);

  return includesAny(text, [
    "monster",
    "monsters",
    "enemy",
    "enemies",
    "creature",
    "creatures",
    "tacet discord",
    "tacet discords",
    "discord",
    "discords",
  ]);
}

function isMonsterListQuestion(message: string) {
  const text = normalize(message);

  const asksForMonsters = isMonsterQuestion(text);

  const asksToList = includesAny(text, [
    "name",
    "list",
    "which",
    "what",
    "can you name",
    "tell me some",
    "show me",
    "examples",
    "one monster",
    "some monsters",
  ]);

  const requestedCount = detectRequestedMonsterCount(text);

  return asksForMonsters && (asksToList || requestedCount !== null);
}

function isRegionQuestion(message: string) {
  const text = normalize(message);

  return (
    detectRegion(text) !== null &&
    includesAny(text, [
      "what is",
      "tell me about",
      "about",
      "overview",
      "culture",
      "governance",
      "sentinel",
      "threnodian",
    ])
  );
}

function isFactionQuestion(message: string) {
  const text = normalize(message);

  return (
    detectFaction(text) !== null &&
    includesAny(text, [
      "what is",
      "tell me about",
      "about",
      "who are",
      "ideology",
      "members",
    ])
  );
}

function isLoreEntryQuestion(message: string) {
  const text = normalize(message);

  const key = detectLoreEntryKey(text);
  if (!key) return false;

  const region = detectRegion(text);
  const faction = detectFaction(text);

  // strict fallback: if it's clearly a region/faction/monster list request,
  // do not let generic lore entry logic steal it
  if (isMonsterListQuestion(text) && region) return false;
  if (isRegionQuestion(text) && region) return false;
  if (isFactionQuestion(text) && faction) return false;

  return true;
}

async function fetchMonstersByRegion(regionName: string) {
  const { data, error } = await supabaseAdmin
    .from("monsters")
    .select("name, element, location, lore, class")
    .ilike("location", `%${regionName}%`)
    .order("name", { ascending: true })
    .limit(20);

  if (error) {
    console.error("fetchMonstersByRegion error:", error);
    return [] as MonsterRow[];
  }

  return (data ?? []) as MonsterRow[];
}

async function fetchRegionByName(regionName: string) {
  const { data, error } = await supabaseAdmin
    .from("regions")
    .select("name, overview, culture, governance, sentinel, threnodian")
    .eq("name", regionName)
    .maybeSingle();

  if (error) {
    console.error("fetchRegionByName error:", error);
    return null;
  }

  return data as RegionRow | null;
}

async function fetchFactionByName(factionName: string) {
  const { data, error } = await supabaseAdmin
    .from("factions")
    .select("name, ideology, members")
    .eq("name", factionName)
    .maybeSingle();

  if (error) {
    console.error("fetchFactionByName error:", error);
    return null;
  }

  return data as FactionRow | null;
}

async function fetchLoreEntryByKey(key: string) {
  const { data, error } = await supabaseAdmin
    .from("lore_entries")
    .select("key, content")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    console.error("fetchLoreEntryByKey error:", error);
    return null;
  }

  return data as LoreEntryRow | null;
}

function buildMonsterFacts(regionName: string, rows: MonsterRow[], requestedCount: number) {
  if (!rows.length) {
    return `Question type: monster list
Region: ${regionName}
Requested count: ${requestedCount}
Exact monster matches: none`;
  }

  const lines = rows.map((row, index) => {
    const parts = [
      `name=${row.name}`,
      row.class ? `class=${row.class}` : "",
      row.element ? `element=${row.element}` : "",
      row.location ? `location=${row.location}` : "",
      row.lore ? `lore=${trimMarkdownNoise(row.lore)}` : "",
    ].filter(Boolean);

    return `${index + 1}. ${parts.join(" | ")}`;
  });

  return `Question type: monster list
Region: ${regionName}
Requested count: ${requestedCount}
Exact monster matches:
${lines.join("\n")}`;
}

function joinNamesNaturally(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function articleFor(word: string) {
  const first = word.trim().charAt(0).toLowerCase();
  return ["a", "e", "i", "o", "u"].includes(first) ? "an" : "a";
}

function buildHumanMonsterReply(regionName: string, rows: MonsterRow[], requestedCount: number) {
  if (!rows.length) {
    return "I don't have enough information about that.";
  }

  const picked = rows.slice(0, requestedCount);
  const names = picked.map((row) => row.name);

  if (picked.length === 1) {
    const monster = picked[0];
    const classText = monster.class ? monster.class.toLowerCase() : "";
    const elementText = monster.element ? monster.element.toLowerCase() : "";
    const descriptor = [classText, elementText].filter(Boolean).join(" ");
    const intro = descriptor ? `${articleFor(descriptor)} ${descriptor}` : "one";
    return `One? ${monster.name}. ${intro.charAt(0).toUpperCase()}${intro.slice(
      1
    )} creature found in ${regionName}.`;
  }

  if (picked.length === 2) {
    return `In ${regionName}? ${joinNamesNaturally(names)} are two I can name.`;
  }

  return `In ${regionName}, ${joinNamesNaturally(names)} are ${picked.length} I can name.`;
}

function buildRegionFacts(row: RegionRow | null, regionName: string) {
  if (!row) {
    return `Question type: region
Region: ${regionName}
No matching region data found.`;
  }

  return `Question type: region
Region: ${row.name}
Overview: ${row.overview ? trimMarkdownNoise(row.overview) : "N/A"}
Culture: ${row.culture ? trimMarkdownNoise(row.culture) : "N/A"}
Governance: ${row.governance ? trimMarkdownNoise(row.governance) : "N/A"}
Sentinel: ${row.sentinel ? trimMarkdownNoise(row.sentinel) : "N/A"}
Threnodian: ${row.threnodian ? trimMarkdownNoise(row.threnodian) : "N/A"}`;
}

function buildFactionFacts(row: FactionRow | null, factionName: string) {
  if (!row) {
    return `Question type: faction
Faction: ${factionName}
No matching faction data found.`;
  }

  return `Question type: faction
Faction: ${row.name}
Ideology: ${row.ideology ? trimMarkdownNoise(row.ideology) : "N/A"}
Members: ${row.members ? trimMarkdownNoise(row.members) : "N/A"}`;
}

function buildLoreEntryFacts(row: LoreEntryRow | null, key: string) {
  if (!row?.content) {
    return `Question type: lore entry
Key: ${key}
No matching lore entry found.`;
  }

  return `Question type: lore entry
Key: ${key}
Content: ${trimMarkdownNoise(row.content)}`;
}

export async function getDirectFactualAnswer(
  message: string
): Promise<FactualAnswerResult> {
  const regionName = detectRegion(message);
  const factionName = detectFaction(message);
  const loreEntryKey = detectLoreEntryKey(message);

  // strict priority order:
  // 1. monster list with region
  // 2. region
  // 3. faction
  // 4. lore entry fallback

  if (isMonsterListQuestion(message) && regionName) {
    const requestedCount = detectRequestedMonsterCount(message) ?? 5;
    const monsters = await fetchMonstersByRegion(regionName);
    const selected = monsters.slice(0, requestedCount);
    const facts = buildMonsterFacts(regionName, selected, requestedCount);
    const directReply = buildHumanMonsterReply(regionName, monsters, requestedCount);

    return {
      answered: true,
      kind: "monster_list",
      facts,
      directReply,
      debug: {
        route: "factual",
        kind: "monster_list",
        matched: {
          region: regionName,
          requestedCount,
          monsterNames: selected.map((row) => row.name),
        },
        facts,
        reply: directReply,
      },
    };
  }

  if (isRegionQuestion(message) && regionName) {
    const region = await fetchRegionByName(regionName);
    const facts = buildRegionFacts(region, regionName);

    return {
      answered: true,
      kind: "region",
      facts,
      debug: {
        route: "factual",
        kind: "region",
        matched: {
          region: regionName,
        },
        facts,
      },
    };
  }

  if (isFactionQuestion(message) && factionName) {
    const faction = await fetchFactionByName(factionName);
    const facts = buildFactionFacts(faction, factionName);

    return {
      answered: true,
      kind: "faction",
      facts,
      debug: {
        route: "factual",
        kind: "faction",
        matched: {
          faction: factionName,
        },
        facts,
      },
    };
  }

  if (isLoreEntryQuestion(message) && loreEntryKey) {
    const entry = await fetchLoreEntryByKey(loreEntryKey);
    const facts = buildLoreEntryFacts(entry, loreEntryKey);

    return {
      answered: true,
      kind: "lore_entry",
      facts,
      debug: {
        route: "factual",
        kind: "lore_entry",
        matched: {
          loreEntryKey,
        },
        facts,
      },
    };
  }

  return {
    answered: false,
    debug: {
      route: "factual",
      matched: {
        region: regionName,
        faction: factionName,
        loreEntryKey,
      },
    },
  };
}