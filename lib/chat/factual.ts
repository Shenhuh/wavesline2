import "server-only";

import { supabaseAdmin } from "@/lib/supabase-admin";

export type FactualCharacterRow = {
  id: string;
  key: string;
  name: string;
  title?: string | null;
  identity_notes?: string | null;
  lore_context?: string | null;
};

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
  kind:
    | "identity"
    | "monster_list"
    | "region"
    | "region_list"
    | "faction"
    | "faction_members"
    | "lore_entry";
  matched: {
    region?: string | null;
    faction?: string | null;
    loreEntryKey?: string | null;
    monsterNames?: string[];
    requestedCount?: number | null;
    character?: string | null;
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
          character?: string | null;
        };
      };
    }
  | {
      answered: true;
      kind: FactualAnswerDebug["kind"];
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
    .replace(/`/g, "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanFactSentence(text: string) {
  return text
    .replace(/\b(in|from)\s+Wuthering\s+Waves\b/gi, "")
    .replace(/\bWuthering\s+Waves\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?;:])/g, "$1")
    .trim();
}

function firstUsefulSentence(text: string | null | undefined) {
  const raw = cleanFactSentence(trimMarkdownNoise(String(text ?? "")));
  if (!raw) return "";
  const parts = raw
    .split(/(?<=[.!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  return parts[0] ?? raw;
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
    if (text.includes(keyword)) return regionName;
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
    if (text.includes(keyword)) return factionName;
  }
  return null;
}

function detectLoreEntryKey(message: string) {
  const text = normalize(message);
  if (includesAny(text, ["tacet discord", "tacet discords", "creature", "creatures", "discord", "discords"])) {
    return "CREATURES_LORE";
  }
  if (includesAny(text, ["world", "solaris", "solaris-3", "solar 3", "lament"])) {
    return "WORLD_LORE";
  }
  return null;
}

function detectRequestedMonsterCount(message: string) {
  const text = normalize(message);
  const numericMatch = text.match(/\b(\d+)\b/);
  if (numericMatch) {
    const count = Number(numericMatch[1]);
    if (Number.isFinite(count) && count > 0) return Math.min(count, 10);
  }
  if (includesAny(text, ["some", "several", "few", "examples", "tell me some", "show me"])) return 5;
  return null;
}

function isIdentityQuestion(message: string) {
  const text = normalize(message);
  return includesAny(text, [
    "who are you",
    "what are you",
    "tell me about yourself",
    "introduce yourself",
    "who exactly are you",
    "what should i call you",
  ]);
}

function isMonsterQuestion(message: string) {
  const text = normalize(message);
  return includesAny(text, ["monster", "monsters", "enemy", "enemies", "creature", "creatures", "tacet discord", "tacet discords", "discord", "discords"]);
}

function isMonsterListQuestion(message: string) {
  const text = normalize(message);
  return isMonsterQuestion(text) && (includesAny(text, ["name", "list", "which", "what", "can you name", "tell me some", "show me", "examples", "one monster", "some monsters"]) || detectRequestedMonsterCount(text) !== null);
}

function isRegionListQuestion(message: string) {
  const text = normalize(message);

  return (
    includesAny(text, [
      "regions in solaris",
      "regions of solaris",
      "regions in solaris-3",
      "regions of solaris-3",
      "tell me the regions",
      "name the regions",
      "list the regions",
      "what are the regions",
      "what regions are there",
      "tell me about the regions",
      "regions of this world",
      "regions in this world",
      "other regions",
      "more regions",
      "tell me more about regions",
      "tell me more about other regions",
      "can you tell me more about regions",
      "can you tell me more about other regions",
    ]) ||
    (/\bregions\b/.test(text) &&
      includesAny(text, [
        "solaris",
        "solaris-3",
        "this world",
        "the world",
        "other",
        "more",
      ]))
  );
}

function isRegionQuestion(message: string) {
  const text = normalize(message);
  return detectRegion(text) !== null && includesAny(text, ["what is", "tell me about", "about", "overview", "culture", "governance", "sentinel", "threnodian", "more about", "describe", "what do you know"]);
}

function isFactionQuestion(message: string) {
  const text = normalize(message);
  return detectFaction(text) !== null && includesAny(text, ["what is", "tell me about", "about", "who are", "ideology", "members"]);
}

function isFactionMemberQuestion(message: string) {
  const text = normalize(message);
  return includesAny(text, ["members", "their members", "their names", "name them", "list them", "can you tell me their members", "can you tell me their names"]);
}

function isLoreEntryQuestion(message: string) {
  const text = normalize(message);
  const key = detectLoreEntryKey(text);
  if (!key) return false;
  if (isMonsterListQuestion(text) && detectRegion(text)) return false;
  if (isRegionQuestion(text) && detectRegion(text)) return false;
  if (isFactionQuestion(text) && detectFaction(text)) return false;
  return true;
}

async function fetchMonstersByRegion(regionName: string) {
  const { data, error } = await supabaseAdmin
    .from("monsters")
    .select("name, element, location, lore, class")
    .ilike("location", `%${regionName}%`)
    .order("name", { ascending: true })
    .limit(20);
  if (error) return [] as MonsterRow[];
  return (data ?? []) as MonsterRow[];
}

async function fetchRegionByName(regionName: string) {
  const { data, error } = await supabaseAdmin
    .from("regions")
    .select("name, overview, culture, governance, sentinel, threnodian")
    .eq("name", regionName)
    .maybeSingle();
  if (error) return null;
  return data as RegionRow | null;
}

async function fetchAllRegions() {
const { data, error } = await supabaseAdmin
  .from("regions")
  .select("*");

console.log("REGION FETCH:", { data, error });
  if (error) return [] as RegionRow[];
  return (data ?? []) as RegionRow[];
}

async function fetchFactionByName(factionName: string) {
  const { data, error } = await supabaseAdmin
    .from("factions")
    .select("name, ideology, members")
    .eq("name", factionName)
    .maybeSingle();
  if (error) return null;
  return data as FactionRow | null;
}

async function fetchLoreEntryByKey(key: string) {
  const { data, error } = await supabaseAdmin
    .from("lore_entries")
    .select("key, content")
    .eq("key", key)
    .maybeSingle();
  if (error) return null;
  return data as LoreEntryRow | null;
}

function parseMembers(raw: string | null | undefined) {
  const text = trimMarkdownNoise(String(raw ?? ""));
  if (!text) return [] as string[];

  const lines = text
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  const names: string[] = [];
  let inNotes = false;

  for (const line of lines) {
    const normalized = line.toLowerCase();

    if (/^#+\s*notes?\b/i.test(line) || /^notes?\b/i.test(line)) {
      inNotes = true;
      continue;
    }
    if (inNotes) continue;
    if (/^#+\s*notable confirmed members\b/i.test(line) || /^notable confirmed members\b/i.test(line)) {
      continue;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (!bulletMatch) continue;

    const body = bulletMatch[1]
      .replace(/\([^)]*\)/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const name = body.split(/[—–-]/)[0]?.trim() ?? "";
    if (!name) continue;
    if (/^(save changes|cancel changes|set to null)$/i.test(name)) continue;
    if (!names.some((x) => x.toLowerCase() === name.toLowerCase())) {
      names.push(name);
    }
  }

  return names;
}

function joinNamesNaturally(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function buildIdentityFacts(character: FactualCharacterRow) {
  return [
    `Question type: identity`,
    `Character: ${character.name}`,
    `Title: ${character.title?.trim() || "N/A"}`,
    `Identity notes: ${trimMarkdownNoise(character.identity_notes ?? "") || "N/A"}`,
    `Lore context: ${trimMarkdownNoise(character.lore_context ?? "") || "N/A"}`,
  ].join("\n");
}

function buildMonsterFacts(regionName: string, rows: MonsterRow[], requestedCount: number) {
  if (!rows.length) {
    return `Question type: monster list\nRegion: ${regionName}\nRequested count: ${requestedCount}\nExact monster matches: none`;
  }
  return `Question type: monster list\nRegion: ${regionName}\nRequested count: ${requestedCount}\nExact monster matches:\n${rows.map((row, i) => `${i + 1}. name=${row.name}`).join("\n")}`;
}

function buildHumanMonsterReply(regionName: string, rows: MonsterRow[], requestedCount: number) {
  if (!rows.length) return "I don't have enough information about that.";
  const picked = rows.slice(0, requestedCount).map((r) => r.name);
  return `In ${regionName}, ${joinNamesNaturally(picked)} are ${picked.length} I can name.`;
}

function buildRegionFacts(row: RegionRow | null, regionName: string) {
  if (!row) return `Question type: region\nRegion: ${regionName}\nNo matching region data found.`;
  return [
    `Question type: region`,
    `Region: ${row.name}`,
    `Overview: ${row.overview ? trimMarkdownNoise(row.overview) : "N/A"}`,
    `Culture: ${row.culture ? trimMarkdownNoise(row.culture) : "N/A"}`,
    `Governance: ${row.governance ? trimMarkdownNoise(row.governance) : "N/A"}`,
    `Sentinel: ${row.sentinel ? trimMarkdownNoise(row.sentinel) : "N/A"}`,
    `Threnodian: ${row.threnodian ? trimMarkdownNoise(row.threnodian) : "N/A"}`,
  ].join("\n");
}

function buildRegionListReply(rows: RegionRow[]) {
  if (!rows.length) return "I don't have enough information about that.";
  return `The regions I can name are ${joinNamesNaturally(rows.map((r) => r.name))}.`;
}

function buildFactionFacts(row: FactionRow | null, factionName: string) {
  if (!row) return `Question type: faction\nFaction: ${factionName}\nNo matching faction data found.`;
  return `Question type: faction\nFaction: ${row.name}\nIdeology: ${row.ideology ? trimMarkdownNoise(row.ideology) : "N/A"}\nMembers: ${row.members ? trimMarkdownNoise(row.members) : "N/A"}`;
}

function buildFactionMemberReply(row: FactionRow | null) {
  if (!row) return "I don't have enough information about that.";
  const names = parseMembers(row.members);
  if (!names.length) return `I know of ${row.name}, but I do not have a clean member list stored.`;
  return `If you want the names plainly: ${joinNamesNaturally(names)}.`;
}

function buildLoreEntryFacts(row: LoreEntryRow | null, key: string) {
  if (!row?.content) return `Question type: lore entry\nKey: ${key}\nNo matching lore entry found.`;
  return `Question type: lore entry\nKey: ${key}\nContent: ${trimMarkdownNoise(row.content)}`;
}
function joinNaturally(values: string[]) {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}
export async function getDirectFactualAnswer(message: string, currentCharacter?: FactualCharacterRow | null): Promise<FactualAnswerResult> {
  const regionName = detectRegion(message);
  const factionName = detectFaction(message);
  const loreEntryKey = detectLoreEntryKey(message);

  if (currentCharacter && isIdentityQuestion(message)) {
    const facts = buildIdentityFacts(currentCharacter);
    return {
      answered: true,
      kind: "identity",
      facts,
      debug: {
        route: "factual",
        kind: "identity",
        matched: { character: currentCharacter.name },
        facts,
      },
    };
  }

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
        matched: { region: regionName, requestedCount, monsterNames: selected.map((r) => r.name) },
        facts,
        reply: directReply,
      },
    };
  }

if (isRegionListQuestion(message)) {
  const rows = await fetchAllRegions();

  console.log("[region_list] rows from fetchAllRegions:", rows.map((r) => r.name));

  if (!rows.length) {
    console.log("[region_list] no rows, returning answered:false");
    return {
      answered: false,
      debug: {
        route: "factual",
        matched: {
          region: regionName,
          faction: factionName,
          loreEntryKey,
          character: currentCharacter?.name ?? null,
        },
      },
    };
  }

  const facts = `Question type: region list\nRegions: ${rows.map((r) => r.name).join(", ")}`;
  console.log("[region_list] facts built:", facts);

  const directReply = `The known regions of Solaris-3 are ${joinNaturally(
    rows.map((r) => r.name)
  )}.`;

  return {
    answered: true,
    kind: "region_list",
    facts,
    directReply,
    debug: {
      route: "factual",
      kind: "region_list",
      matched: {},
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
      debug: { route: "factual", kind: "region", matched: { region: regionName }, facts },
    };
  }

  if (factionName && (isFactionMemberQuestion(message) || (isFactionQuestion(message) && normalize(message).includes("members")))) {
    const faction = await fetchFactionByName(factionName);
    const facts = buildFactionFacts(faction, factionName);
    const directReply = buildFactionMemberReply(faction);
    return {
      answered: true,
      kind: "faction_members",
      facts,
      directReply,
      debug: { route: "factual", kind: "faction_members", matched: { faction: factionName }, facts, reply: directReply },
    };
  }

  if (isFactionQuestion(message) && factionName) {
    const faction = await fetchFactionByName(factionName);
    const facts = buildFactionFacts(faction, factionName);
    return {
      answered: true,
      kind: "faction",
      facts,
      debug: { route: "factual", kind: "faction", matched: { faction: factionName }, facts },
    };
  }

  if (isLoreEntryQuestion(message) && loreEntryKey) {
    const loreEntry = await fetchLoreEntryByKey(loreEntryKey);
    if (loreEntry?.content) {
      const facts = buildLoreEntryFacts(loreEntry, loreEntryKey);
      return {
        answered: true,
        kind: "lore_entry",
        facts,
        debug: { route: "factual", kind: "lore_entry", matched: { loreEntryKey }, facts },
      };
    }
  }

  return {
    answered: false,
    debug: {
      route: "factual",
      matched: {
        region: regionName,
        faction: factionName,
        loreEntryKey,
        character: currentCharacter?.name ?? null,
      },
    },
  };
}
