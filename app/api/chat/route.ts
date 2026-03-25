import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createReplyPlannerPrompt,
  normalizeModelReply,
  isWeakCharacterReply,
  buildRepairPrompt,
} from "@/lib/chat/reply-orchestrator";
import { plannerProfiles } from "@/lib/chat/planner-config";
import {
  applyAssistantReplyEffects,
  applyBlockingRule,
  deriveNextThreadRuntimeState,
  seedRuntimeStateFromRelationship,
} from "@/lib/chat/runtime-thread-state";
import {
  getThreadRuntimeState,
  upsertThreadRuntimeState,
} from "@/lib/chat/app-chat";
import {
  buildEventContextBlock,
  getRelevantEventsForCharacter,
} from "@/lib/chat/events";
import {
  buildMonsterContextBlock,
  searchRelevantMonsters,
} from "@/lib/chat/monsters";
import { chooseStickerForAiReply } from "@/lib/chat/sticker-ai";
import { getDirectFactualAnswer } from "@/lib/chat/factual";
import { getLoreContextForCharacter } from "@/lib/chat/lore";

type CharacterRow = {
  id: string;
  key: string;
  name: string;
  title: string | null;
  starter_message: string | null;
  base_tone: string | null;
  style_notes: string[] | null;
  likes: string[] | null;
  dislikes: string[] | null;
  allowed_modes: string[] | null;
  identity_notes: string | null;
  conversation_rules: string | null;
  relationship_behavior: string | null;
  lore_context: string | null;
  hard_constraints: string | null;
  annoyance_threshold: number;
  block_message: string | null;
  sticker_enabled: boolean;
  sticker_base_chance: number;
  sticker_mood_influence: number;
  forms: Array<{
    display_name: string;
    avatar: string;
    trigger_type: "mood" | "random";
    mood_triggers: string[];
    chance: number;
  }> | null;
};

type ThreadRow = {
  id: string;
  user_id: string;
  active_character_id: string;
  contact_character_id: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_role: "active" | "contact";
  content: string | null;
  created_at: string;
  message_type?: "text" | "sticker" | "gif";
  sticker_id?: string | null;
  gif_url?: string | null;
  sticker?: {
    id: string;
    key: string;
    label: string;
    image_path: string;
  } | null;
  resolved_name?: string | null;
  resolved_avatar?: string | null;
};

type RelationshipRow = {
  id: string;
  relationship_label: string | null;
  affinity: number;
  trust: number;
  familiarity: number;
  notes: string | null;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

type GiphySearchResponse = {
  gifs?: Array<{
    id: string;
    title: string;
    url: string;
    preview?: string;
    width?: number;
    height?: number;
  }>;
};

type VisionAnalysis = {
  hasVisual: boolean;
  medium: "image" | "gif" | "unknown";
  recognizedCharacter: string | null;
  possibleCharacter: string | null;
  series: string | null;
  action: string | null;
  expression: string | null;
  confidence: "high" | "medium" | "low";
  conciseSummary: string | null;
  rawText: string | null;
};

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEFAULT_OPENAI_VISION_MODEL =
  process.env.OPENAI_VISION_MODEL || "gpt-4.1-mini";

const MAX_HISTORY = 8;
const DUPLICATE_MESSAGE_WINDOW_MS = 60_000;
const GIF_DUPLICATE_WINDOW_MS = 120_000;

function arr(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function extractReply(data: OpenRouterResponse): string {
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

function normalizeLooseText(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function isWithinWindow(isoDate: string, windowMs: number) {
  const time = new Date(isoDate).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= windowMs;
}


function replyDeniesSeenCharacter(reply: string) {
  const text = normalizeLooseText(reply);

  return (
    text.includes("that is not me") ||
    text.includes("that's not me") ||
    text.includes("that isnt me") ||
    text.includes("that isn't me") ||
    text.includes("this is not me") ||
    text.includes("not me.")
  );
}


function includesAnyLoose(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

function detectFactionNameFromText(message: string) {
  const text = normalizeLooseText(message);

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

  for (const [keyword, name] of Object.entries(map)) {
    if (text.includes(keyword)) return name;
  }

  return null;
}

function isFactionFollowupQuestion(message: string) {
  const text = normalizeLooseText(message);

  return (
    includesAnyLoose(text, [
      "their names",
      "their members",
      "the members",
      "member names",
      "who are they",
      "who are the members",
      "can you tell me their names",
      "can you tell me their members",
      "do you know their members",
      "tell me their names",
      "tell me their members",
    ]) ||
    (/\btheir\b/.test(text) && /\b(names|members)\b/.test(text))
  );
}

function inferFactionNameFromRecentHistory(messages: MessageRow[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const content = messages[i]?.content;
    if (!content) continue;
    const match = detectFactionNameFromText(content);
    if (match) return match;
  }
  return null;
}

async function fetchFactionByNameDirect(args: {
  supabase: ReturnType<typeof createAdminClient>;
  factionName: string;
}) {
  const { supabase, factionName } = args;

  const { data, error } = await supabase
    .from("factions")
    .select("name, ideology, members")
    .eq("name", factionName)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as { name: string; ideology: string | null; members: string | null } | null) ?? null;
}

function parseFactionMembers(raw: string | null | undefined) {
  const text = String(raw ?? "").trim();
  if (!text) return [] as string[];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const names: string[] = [];
  for (const line of lines) {
    if (/^#{1,6}\s*/.test(line)) continue;
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const source = bullet ? bullet[1] : line;
    const cleaned = source
      .replace(/^[•]+\s*/, "")
      .split(/[—–-]/)[0]
      .replace(/\([^)]*\)/g, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) continue;
    if (/^(notable confirmed members|notes|save changes|cancel changes)$/i.test(cleaned)) continue;
    if (!names.includes(cleaned)) names.push(cleaned);
  }

  return names;
}

function joinNaturally(values: string[]) {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function buildFactionMembersReply(args: {
  factionName: string;
  members: string[];
}) {
  const { factionName, members } = args;
  if (!members.length) return `I don't have enough information about the members of ${factionName}.`;
  return `Known ${factionName} members include ${joinNaturally(members)}.`;
}

function isRegionListQuestion(message: string) {
  const text = normalizeLooseText(message);
  return (
    includesAnyLoose(text, [
      "what are the regions",
      "what regions are there",
      "tell me the regions",
      "name the regions",
      "list the regions",
      "tell me about the regions",
      "regions of this world",
      "regions in this world",
      "what are the regions of this world",
      "all regions",
      "other regions",
      "more regions",
      "tell me more about regions",
      "tell me more about other regions",
      "can you tell me more about regions",
      "can you tell me more about other regions",
      "regions of solaris",
      "regions of solaris-3",
      "regions in solaris",
      "regions in solaris-3",
    ]) ||
    (/\bregions\b/.test(text) &&
      includesAnyLoose(text, ["solaris-3", "solaris 3", "solaris", "all regions", "this world", "the world", "other", "more"]))
  );
}

async function fetchAllRegionsDirect(args: {
  supabase: ReturnType<typeof createAdminClient>;
}) {
  const { supabase } = args;
  const { data, error } = await supabase
    .from("regions")
    .select("name")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as Array<{ name: string | null }>)
    .map((row) => String(row.name ?? "").trim())
    .filter(Boolean);
}

function buildRegionListReply(regionNames: string[]) {
  if (!regionNames.length) return "I don't have enough information about that.";
  return `The known regions of Solaris-3 are ${joinNaturally(regionNames)}.`;
}

function trimDbText(text: string | null | undefined) {
  return String(text ?? "")
    .replace(/#{1,6}\s*/g, "")      // Remove markdown headers
    .replace(/\*\*/g, "")           // Remove bold markers
    .replace(/`/g, "")              // Remove inline code markers
    .replace(/\n{2,}/g, "\n")       // Replace 2+ newlines with single newline
    .replace(/\n/g, "")             // Then remove all newlines if that's the goal
    .trim();
}

function firstSentence(text: string | null | undefined) {
  const cleaned = trimDbText(text)
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "";

  const sentenceMatch = cleaned.match(/^[^.!?]+[.!?]?/);
  return (sentenceMatch?.[0] ?? cleaned).trim();
}

function isCharacterIdentityQuestion(message: string) {
  const text = normalizeLooseText(message);

  return (
    /^who are you\??$/.test(text) ||
    /^what are you\??$/.test(text) ||
    includesAnyLoose(text, [
      "who are you",
      "what are you",
      "tell me about yourself",
      "introduce yourself",
      "who is phrolova",
      "what is phrolova",
      "tell me who you are",
      "your title",
      "what should i call you",
    ])
  );
}

function buildCharacterIdentityDirectReply(character: CharacterRow) {
  const parts: string[] = [];

  parts.push(`I am ${character.name}.`);

  if (character.title?.trim()) {
    parts.push(`${character.title.trim()}.`);
  }

  const identityLine = firstSentence(character.identity_notes);
  if (identityLine) {
    if (!parts.some((p) => p.toLowerCase() === identityLine.toLowerCase())) {
      parts.push(identityLine.endsWith(".") || identityLine.endsWith("!") || identityLine.endsWith("?") ? identityLine : `${identityLine}.`);
    }
  } else {
    const loreLine = firstSentence(character.lore_context);
    if (loreLine) {
      parts.push(loreLine.endsWith(".") || loreLine.endsWith("!") || loreLine.endsWith("?") ? loreLine : `${loreLine}.`);
    }
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function buildCharacterIdentityFacts(character: CharacterRow) {
  return [
    "Question type: character identity",
    `Character: ${character.name}`,
    `Title: ${character.title?.trim() || "N/A"}`,
    `Identity notes: ${trimDbText(character.identity_notes) || "N/A"}`,
    `Lore context: ${trimDbText(character.lore_context) || "N/A"}`,
  ].join("");
}

function mapDbCharacterToPlannerProfile(character: CharacterRow) {
  const fallback = plannerProfiles[character.key] ?? plannerProfiles["phrolova"];

  return {
    key: character.key,
    name: character.name,
    baseTone:
      (character.base_tone as
        | "warm"
        | "neutral"
        | "cold"
        | "playful"
        | "concerned"
        | "annoyed"
        | "curious"
        | "guarded"
        | undefined) ??
      fallback?.baseTone ??
      "neutral",
    defaultReplyLength: fallback?.defaultReplyLength ?? "medium",
    styleNotes:
      arr(character.style_notes).length > 0
        ? arr(character.style_notes)
        : fallback?.styleNotes ?? [],
    likes:
      arr(character.likes).length > 0
        ? arr(character.likes)
        : fallback?.likes ?? [],
    dislikes:
      arr(character.dislikes).length > 0
        ? arr(character.dislikes)
        : fallback?.dislikes ?? [],
    allowedModes:
      arr(character.allowed_modes).length > 0
        ? (arr(character.allowed_modes) as Array<
            | "direct_answer"
            | "brief_answer"
            | "question_back"
            | "tease_then_answer"
            | "comfort"
            | "deflect"
            | "guarded_answer"
            | "lore_explain"
            | "challenge"
            | "romantic_soft"
            | "meta_boundary"
            | "observe_then_answer"
          >)
        : fallback?.allowedModes,
  };
}

function buildPlannerRelationshipState(input: {
  affinity: number;
  annoyance: number;
  trust: number;
  familiarity: number;
  mood: string;
  blocked: boolean;
}) {
  return {
    affinity: input.affinity,
    annoyance: input.annoyance,
    trust: input.trust,
    familiarity: input.familiarity,
    mood: input.mood,
    blocked: input.blocked,
  };
}

function buildHistory(messages: MessageRow[]) {
  return messages
    .filter((m) => m.message_type !== "sticker" && m.message_type !== "gif")
    .map((m) => ({
      role: m.sender_role === "active" ? ("user" as const) : ("assistant" as const),
      content: m.content ?? "",
    }));
}

function cleanupVisionText(text: string): string {
  return text.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
}

function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(cleanupVisionText(text)) as T;
  } catch {
    return fallback;
  }
}

function normalizeVisionAnalysis(input: Partial<VisionAnalysis> | null | undefined): VisionAnalysis {
  const confidence =
    input?.confidence === "high" || input?.confidence === "medium" || input?.confidence === "low"
      ? input.confidence
      : "low";

  const medium =
    input?.medium === "image" || input?.medium === "gif" || input?.medium === "unknown"
      ? input.medium
      : "unknown";

  return {
    hasVisual: Boolean(input?.hasVisual),
    medium,
    recognizedCharacter:
      typeof input?.recognizedCharacter === "string" && input.recognizedCharacter.trim()
        ? input.recognizedCharacter.trim()
        : null,
    possibleCharacter:
      typeof input?.possibleCharacter === "string" && input.possibleCharacter.trim()
        ? input.possibleCharacter.trim()
        : null,
    series:
      typeof input?.series === "string" && input.series.trim()
        ? input.series.trim()
        : null,
    action:
      typeof input?.action === "string" && input.action.trim()
        ? input.action.trim()
        : null,
    expression:
      typeof input?.expression === "string" && input.expression.trim()
        ? input.expression.trim()
        : null,
    confidence,
    conciseSummary:
      typeof input?.conciseSummary === "string" && input.conciseSummary.trim()
        ? input.conciseSummary.trim()
        : null,
    rawText:
      typeof input?.rawText === "string" && input.rawText.trim() ? input.rawText.trim() : null,
  };
}

async function callOpenAIVision(args: {
  apiKey: string;
  imageUrl: string;
  mediumHint?: "image" | "gif" | "unknown";
}) {
  const { apiKey, imageUrl, mediumHint = "unknown" } = args;

  const prompt = `
Analyze this visual carefully.

Return STRICT JSON only with this exact shape:
{
  "hasVisual": true,
  "medium": "image" | "gif" | "unknown",
  "recognizedCharacter": string | null,
  "possibleCharacter": string | null,
  "series": string | null,
  "action": string | null,
  "expression": string | null,
  "confidence": "high" | "medium" | "low",
  "conciseSummary": string | null
}

Rules:
- Only name a character if visually confident.
- If not confident, set "recognizedCharacter" to null.
- "possibleCharacter" may contain a tentative guess if there is one.
- Do not guess a weapon, occupation, lore, or personality.
- Do not say someone has a sword, gun, staff, or other weapon unless it is clearly visible.
- "action" must describe only obvious visible action in a short phrase.
- "expression" must describe the obvious visible facial expression briefly.
- "conciseSummary" must be visual-only and brief.
- If this seems related to Wuthering Waves, set "series" to "Wuthering Waves".
- Use medium hint if helpful: ${mediumHint}.
`.trim();

console.log("[vision-request]", {
  model: DEFAULT_OPENAI_VISION_MODEL,
  hasImageUrl: !!imageUrl,
  imageUrlPreview: imageUrl ? imageUrl.slice(0, 120) : null,
});

  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_VISION_MODEL,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            {
              type: "input_image",
              image_url: imageUrl,
            },
          ],
          
        },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
    }),
  });

  const data = await response.json();

  const outputText =
    typeof data?.output_text === "string"
      ? data.output_text
      : Array.isArray(data?.output)
      ? data.output
          .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
          .map((c: any) => c?.text ?? "")
          .filter(Boolean)
          .join("\n")
      : "";

  const parsed = safeJsonParse<Partial<VisionAnalysis>>(outputText, {
    hasVisual: true,
    medium: mediumHint,
    recognizedCharacter: null,
    possibleCharacter: null,
    series: null,
    action: null,
    expression: null,
    confidence: "low",
    conciseSummary: null,
  });

  const normalized = normalizeVisionAnalysis({
    ...parsed,
    rawText: outputText || null,
  });

  return {
    ok: response.ok,
    status: response.status,
    data,
    analysis: normalized,
  };
}

function buildVisualContextBlock(args: {
  vision: VisionAnalysis | null;
  activeCharacter: CharacterRow;
  contactCharacter: CharacterRow;
  detectedRelationship?: {
    name: string;
    relationship_label: string | null;
    affinity: number;
    trust: number;
    familiarity: number;
    notes: string | null;
  } | null;
}) {
  const { vision, activeCharacter, contactCharacter, detectedRelationship } = args;
  if (!vision || !vision.hasVisual) return "";

  const lines: string[] = [];
  const recognized = vision.recognizedCharacter?.trim() || null;
  const possible = (vision as any).possibleCharacter?.trim() || null;
  const matchActive = recognized === activeCharacter.name || possible === activeCharacter.name;
  const matchContact = recognized === contactCharacter.name || possible === contactCharacter.name;

  lines.push("A visual attachment is present.");

  if (matchActive) {
    lines.push(`The visual most likely shows ${activeCharacter.name}, the user-presented character.`);
    lines.push("Treat that as the user, not as a third-person identification task.");
  } else if (matchContact) {
    lines.push(`The visual most likely shows ${contactCharacter.name}.`);
  } else if (recognized) {
    lines.push(`Recognized character: ${recognized}.`);
  } else if (possible) {
    lines.push(`Possible character: ${possible}.`);
  }

  if (vision.action) lines.push(`Visible action: ${vision.action}.`);
  if (vision.expression) lines.push(`Visible expression: ${vision.expression}.`);

  if (detectedRelationship) {
    lines.push(
      `${contactCharacter.name} has an existing relationship with ${detectedRelationship.name}: ` +
        `label=${detectedRelationship.relationship_label ?? "unspecified"}, ` +
        `affinity=${detectedRelationship.affinity}, trust=${detectedRelationship.trust}, familiarity=${detectedRelationship.familiarity}.`
    );

    if (detectedRelationship.notes?.trim()) {
      lines.push(`Relationship notes: ${detectedRelationship.notes.trim()}`);
    }

    lines.push("Let that relationship influence the reaction more than generic visual description.");
  }

  lines.push("Mention only what is visually clear.");
  lines.push("Do not mention franchise or series names unless the user explicitly asks.");
  lines.push("Keep any visual reference brief and natural.");

  return lines.join("\n");
}

async function findRelationshipWithDetectedCharacter(args: {
  supabase: ReturnType<typeof createAdminClient>;
  contactCharacterId: string;
  detectedCharacterName: string | null;
}) {
  const { supabase, contactCharacterId, detectedCharacterName } = args;

  const detected = String(detectedCharacterName ?? "").trim();
  if (!detected) return null;

  const { data: targetCharacter, error: targetError } = await supabase
    .from("characters")
    .select("id, name")
    .ilike("name", detected)
    .maybeSingle();

  if (targetError || !targetCharacter) return null;

  const { data: rel, error: relError } = await supabase
    .from("character_relationships")
    .select("relationship_label, affinity, trust, familiarity, notes")
    .eq("source_character_id", contactCharacterId)
    .eq("target_character_id", targetCharacter.id)
    .maybeSingle();

  if (relError) return null;

  return rel
    ? {
        name: targetCharacter.name as string,
        relationship_label: rel.relationship_label as string | null,
        affinity: Number(rel.affinity ?? 0),
        trust: Number(rel.trust ?? 0),
        familiarity: Number(rel.familiarity ?? 0),
        notes: (rel.notes as string | null) ?? null,
      }
    : null;
}

function shouldIncludeEventContext(message: string, vision: VisionAnalysis | null) {
  const text = normalizeLooseText(message);
  if (!text) return false;
  if (isRegionListQuestion(text)) return false;

  return /(lore|story|history|past|event|timeline|region|faction|sentinel|threnodian|fractsidus|lament|patch)/i.test(text);
}

function shouldIncludeMonsterContext(message: string) {
  const text = normalizeLooseText(message);
  if (!text) return false;

  return /(monster|enemy|boss|echo|tacet|overlord|calamity|nightmare)/i.test(text);
}

function buildFactualContextBlock(args: {
  factual:
    | Awaited<ReturnType<typeof getDirectFactualAnswer>>
    | null;
}) {
  const factual = args.factual;
  if (!factual?.answered) return "";

  const lines: string[] = [];
  lines.push("FACTUAL WORLD KNOWLEDGE");
  lines.push("The user asked for factual information. Use the exact facts below as the backbone of the reply.");
  lines.push("Stay in character and conversational, but do not invent facts beyond what is written here.");
  lines.push("Answer naturally like a roleplay chatbot, not like a wiki paste and not like a detached assistant.");
  lines.push("When the user asks about identity, answer in first person and make it sound like self-introduction, but keep the factual content grounded in these facts.");
  lines.push("For lists like members, monsters, or regions, keep the listed names exact.");
  if (factual.kind === "region_list") {
    lines.push("This is a region-list answer.");
    lines.push("You may rephrase naturally, but every named place in the reply must come from the allowed region names below.");
    lines.push("Do not add cities, subregions, landmarks, nations, or guesses that are not explicitly listed.");
  }
  lines.push("Do not contradict these facts.");
  lines.push(factual.facts);

  return lines.join("\n");
}


function shouldLockDirectFactualReply(
  factual:
    | Awaited<ReturnType<typeof getDirectFactualAnswer>>
    | null
) {
  if (!factual?.answered) return false;
  return (
    factual.kind === "faction_members" ||
    factual.kind === "monster_list" ||
    factual.kind === "region_list"
  );
}

function buildWorldContext(args: {
  activeCharacter: CharacterRow;
  contactCharacter: CharacterRow;
  runtimeState: {
    affinity: number;
    annoyance: number;
    trust: number;
    familiarity: number;
    mood: string;
    blocked: boolean;
    messageCount: number;
  };
  factualContext: string;
  retrievedLoreContext: string;
  eventContext: string;
  monsterContext: string;
  visualContext: string;
}) {
  const {
    activeCharacter,
    contactCharacter,
    runtimeState,
    factualContext,
    retrievedLoreContext,
    eventContext,
    monsterContext,
    visualContext,
  } = args;

  const pieces: string[] = [];

  pieces.push(`Chat app context: the user is portraying ${activeCharacter.name}. You are ${contactCharacter.name}.`);
  pieces.push("Reply like a real person texting: concise, in-character, no markdown, no stage directions.");
  pieces.push(
    `Current live state: affinity=${runtimeState.affinity}, annoyance=${runtimeState.annoyance}, trust=${runtimeState.trust}, familiarity=${runtimeState.familiarity}, mood=${runtimeState.mood}, blocked=${runtimeState.blocked}.`
  );

  if (contactCharacter.title) pieces.push(`${contactCharacter.name} title: ${contactCharacter.title}.`);
  if (factualContext.trim()) pieces.push(factualContext);
  if (retrievedLoreContext.trim()) pieces.push(retrievedLoreContext);
  if (visualContext.trim()) pieces.push(visualContext);
  if (eventContext.trim()) pieces.push(eventContext);
  if (monsterContext.trim()) pieces.push(monsterContext);

  return pieces.join("\n\n");
}

function logTokenUsage(args: {
  stage: "vision-pass" | "first-pass" | "repair-pass";
  model: string;
  threadId: string;
  character: string;
  usage?: any;
}) {
  const usage = args.usage;

  console.log("[token-usage]", {
    stage: args.stage,
    model: args.model,
    threadId: args.threadId,
    character: args.character,
    prompt_tokens: usage?.prompt_tokens ?? usage?.input_tokens ?? null,
    completion_tokens: usage?.completion_tokens ?? usage?.output_tokens ?? null,
    total_tokens: usage?.total_tokens ?? null,
  });
}

function logCombinedTokenUsage(args: {
  model: string;
  threadId: string;
  character: string;
  firstUsage?: OpenRouterResponse["usage"];
  repairUsage?: OpenRouterResponse["usage"];
  visionUsage?: any;
}) {
  const promptTokens =
    (args.firstUsage?.prompt_tokens ?? 0) +
    (args.repairUsage?.prompt_tokens ?? 0) +
    (args.visionUsage?.prompt_tokens ?? args.visionUsage?.input_tokens ?? 0);

  const completionTokens =
    (args.firstUsage?.completion_tokens ?? 0) +
    (args.repairUsage?.completion_tokens ?? 0) +
    (args.visionUsage?.completion_tokens ?? args.visionUsage?.output_tokens ?? 0);

  const totalTokens =
    (args.firstUsage?.total_tokens ?? 0) +
    (args.repairUsage?.total_tokens ?? 0) +
    (args.visionUsage?.total_tokens ?? 0);

  console.log("[token-usage:combined-message]", {
    model: args.model,
    threadId: args.threadId,
    character: args.character,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
  });
}

function resolveActiveForm(
  character: CharacterRow,
  mood: string
): { name: string; avatar: string | null } {
  const forms = character.forms;
  if (!forms || forms.length === 0) {
    return { name: character.name, avatar: null };
  }

  const moodMatch = forms
    .filter((f) => f.trigger_type === "mood")
    .find((f) =>
      (f.mood_triggers ?? []).some((t) => t.toLowerCase() === mood.toLowerCase())
    );

  if (moodMatch) {
    return {
      name: moodMatch.display_name || character.name,
      avatar: moodMatch.avatar || null,
    };
  }

  const randomForms = forms.filter((f) => f.trigger_type === "random");
  for (const form of randomForms) {
    const chance = Number(form.chance ?? 0);
    if (chance > 0 && Math.random() < chance) {
      return {
        name: form.display_name || character.name,
        avatar: form.avatar || null,
      };
    }
  }

  return { name: character.name, avatar: null };
}

async function getThreadData(threadId: string) {
  const supabase = createAdminClient();

  const { data: thread, error: threadError } = await supabase
    .from("chat_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (threadError || !thread) {
    throw new Error(threadError?.message || "Thread not found.");
  }

  const threadRow = thread as ThreadRow;

  const [
    activeCharacterResult,
    contactCharacterResult,
    messagesResult,
    relationshipResult,
  ] = await Promise.all([
    supabase.from("characters").select("*").eq("id", threadRow.active_character_id).single(),
    supabase.from("characters").select("*").eq("id", threadRow.contact_character_id).single(),
    supabase
      .from("chat_messages")
      .select(`
        id,
        thread_id,
        sender_role,
        content,
        created_at,
        message_type,
        sticker_id,
        gif_url,
        resolved_name,
        resolved_avatar,
        sticker:stickers (
          id,
          key,
          label,
          image_path
        )
      `)
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true }),
    supabase
      .from("character_relationships")
      .select("*")
      .eq("source_character_id", threadRow.contact_character_id)
      .eq("target_character_id", threadRow.active_character_id)
      .maybeSingle(),
  ]);

  if (activeCharacterResult.error || !activeCharacterResult.data) {
    throw new Error(activeCharacterResult.error?.message || "Active character not found.");
  }

  if (contactCharacterResult.error || !contactCharacterResult.data) {
    throw new Error(contactCharacterResult.error?.message || "Contact character not found.");
  }

  if (messagesResult.error) throw new Error(messagesResult.error.message);
  if (relationshipResult.error) throw new Error(relationshipResult.error.message);

  const normalizedMessages = ((messagesResult.data ?? []) as any[]).map((row) => ({
    id: row.id,
    thread_id: row.thread_id,
    sender_role: row.sender_role,
    content: row.content,
    created_at: row.created_at,
    message_type: row.message_type ?? "text",
    sticker_id: row.sticker_id ?? null,
    gif_url: row.gif_url ?? null,
    resolved_name: row.resolved_name ?? null,
    resolved_avatar: row.resolved_avatar ?? null,
    sticker: Array.isArray(row.sticker) ? row.sticker[0] ?? null : row.sticker,
  })) as MessageRow[];

  return {
    supabase,
    thread: threadRow,
    activeCharacter: activeCharacterResult.data as CharacterRow,
    contactCharacter: contactCharacterResult.data as CharacterRow,
    messages: normalizedMessages.slice(-MAX_HISTORY),
    relationship: (relationshipResult.data ?? null) as RelationshipRow | null,
  };
}

async function insertTextMessage(args: {
  supabase: ReturnType<typeof createAdminClient>;
  threadId: string;
  senderRole: "active" | "contact";
  content: string;
  resolvedName?: string | null;
  resolvedAvatar?: string | null;
}) {
  const { supabase, threadId, senderRole, content, resolvedName, resolvedAvatar } = args;

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      sender_role: senderRole,
      content,
      message_type: "text",
      sticker_id: null,
      gif_url: null,
      resolved_name: resolvedName ?? null,
      resolved_avatar: resolvedAvatar ?? null,
    })
    .select(`
      id,
      thread_id,
      sender_role,
      content,
      created_at,
      message_type,
      sticker_id,
      gif_url,
      resolved_name,
      resolved_avatar,
      sticker:stickers (
        id,
        key,
        label,
        image_path
      )
    `)
    .single();

  if (error) throw new Error(error.message);

  const normalized = {
    ...(data as any),
    sticker: Array.isArray((data as any).sticker)
      ? (data as any).sticker[0] ?? null
      : (data as any).sticker,
    gif_url: (data as any).gif_url ?? null,
    resolved_name: (data as any).resolved_name ?? null,
    resolved_avatar: (data as any).resolved_avatar ?? null,
  } as MessageRow;

  const { error: threadError } = await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  if (threadError) throw new Error(threadError.message);

  return normalized;
}

async function insertStickerMessage(args: {
  supabase: ReturnType<typeof createAdminClient>;
  threadId: string;
  senderRole: "active" | "contact";
  stickerId: string;
  resolvedName?: string | null;
  resolvedAvatar?: string | null;
}) {
  const { supabase, threadId, senderRole, stickerId, resolvedName, resolvedAvatar } = args;

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      sender_role: senderRole,
      content: null,
      message_type: "sticker",
      sticker_id: stickerId,
      gif_url: null,
      resolved_name: resolvedName ?? null,
      resolved_avatar: resolvedAvatar ?? null,
    })
    .select(`
      id,
      thread_id,
      sender_role,
      content,
      created_at,
      message_type,
      sticker_id,
      gif_url,
      resolved_name,
      resolved_avatar,
      sticker:stickers (
        id,
        key,
        label,
        image_path
      )
    `)
    .single();

  if (error) throw new Error(error.message);

  const normalized = {
    ...(data as any),
    sticker: Array.isArray((data as any).sticker)
      ? (data as any).sticker[0] ?? null
      : (data as any).sticker,
    gif_url: (data as any).gif_url ?? null,
    resolved_name: (data as any).resolved_name ?? null,
    resolved_avatar: (data as any).resolved_avatar ?? null,
  } as MessageRow;

  const { error: threadError } = await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  if (threadError) throw new Error(threadError.message);

  return normalized;
}

async function insertGifMessage(args: {
  supabase: ReturnType<typeof createAdminClient>;
  threadId: string;
  senderRole: "active" | "contact";
  gifUrl: string;
  gifTitle?: string | null;
  resolvedName?: string | null;
  resolvedAvatar?: string | null;
}) {
  const {
    supabase,
    threadId,
    senderRole,
    gifUrl,
    gifTitle,
    resolvedName,
    resolvedAvatar,
  } = args;

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      sender_role: senderRole,
      content: gifTitle ?? null,
      message_type: "gif",
      sticker_id: null,
      gif_url: gifUrl,
      resolved_name: resolvedName ?? null,
      resolved_avatar: resolvedAvatar ?? null,
    })
    .select(`
      id,
      thread_id,
      sender_role,
      content,
      created_at,
      message_type,
      sticker_id,
      gif_url,
      resolved_name,
      resolved_avatar,
      sticker:stickers (
        id,
        key,
        label,
        image_path
      )
    `)
    .single();

  if (error) throw new Error(error.message);

  const normalized = {
    ...(data as any),
    sticker: Array.isArray((data as any).sticker)
      ? (data as any).sticker[0] ?? null
      : (data as any).sticker,
    gif_url: (data as any).gif_url ?? null,
    resolved_name: (data as any).resolved_name ?? null,
    resolved_avatar: (data as any).resolved_avatar ?? null,
  } as MessageRow;

  const { error: threadError } = await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  if (threadError) throw new Error(threadError.message);

  return normalized;
}

async function callDeepSeek(args: {
  apiKey: string;
  model: string;
  prompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
}) {
  const { apiKey, model, prompt, temperature, topP, maxTokens } = args;

  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: prompt }],
      temperature,
      top_p: topP,
      max_tokens: maxTokens,
    }),
  });

  const data = (await response.json()) as OpenRouterResponse;

  return {
    response,
    data,
    reply: normalizeModelReply(extractReply(data)),
  };
}

function buildGifQueries(args: {
  character: CharacterRow;
  userMessage: string;
  replyText: string;
  mood: string;
  vision: VisionAnalysis | null;
}) {
  const { character, userMessage, replyText, mood, vision } = args;
  const combined = `${userMessage} ${replyText}`.toLowerCase();

  const queries: string[] = [];
  const ww = "wuthering waves";
  const charName = character.name.trim();

  if (vision?.recognizedCharacter) {
    queries.push(`${vision.recognizedCharacter} wuthering waves reaction gif`);
    queries.push(`${vision.recognizedCharacter} wuwa gif`);
  }

  if (
    combined.includes("hello") ||
    combined.includes("hi") ||
    combined.includes("hey") ||
    combined.includes("good morning") ||
    combined.includes("good evening")
  ) {
    queries.push(`${ww} greeting reaction`);
    queries.push(`${ww} hello reaction`);
  }

  if (
    combined.includes("haha") ||
    combined.includes("lol") ||
    combined.includes("funny") ||
    combined.includes("joke") ||
    combined.includes("tease")
  ) {
    queries.push(`${ww} laugh reaction`);
    queries.push(`${ww} smug reaction`);
  }

  if (
    combined.includes("sad") ||
    combined.includes("sorry") ||
    combined.includes("hurt") ||
    combined.includes("miss") ||
    combined.includes("apolog")
  ) {
    queries.push(`${ww} sad reaction`);
    queries.push(`${ww} soft reaction`);
  }

  if (
    combined.includes("what") ||
    combined.includes("huh") ||
    combined.includes("why") ||
    combined.includes("really") ||
    combined.includes("seriously") ||
    combined.includes("confused")
  ) {
    queries.push(`${ww} confused reaction`);
    queries.push(`${ww} surprised reaction`);
  }

  if (
    combined.includes("love") ||
    combined.includes("cute") ||
    combined.includes("beautiful") ||
    combined.includes("pretty") ||
    combined.includes("kiss") ||
    combined.includes("like you")
  ) {
    queries.push(`${ww} blush reaction`);
    queries.push(`${ww} flustered reaction`);
  }

  if (
    combined.includes("fight") ||
    combined.includes("battle") ||
    combined.includes("monster") ||
    combined.includes("enemy") ||
    combined.includes("danger")
  ) {
    queries.push(`${ww} battle reaction`);
    queries.push(`${ww} serious reaction`);
  }

  if (
    combined.includes("lie") ||
    combined.includes("fake") ||
    combined.includes("trust") ||
    combined.includes("doubt") ||
    combined.includes("facade") ||
    combined.includes("manipulate")
  ) {
    queries.push(`${ww} suspicious reaction`);
    queries.push(`${ww} judging reaction`);
  }

  if (mood === "annoyed") {
    queries.push(`${ww} annoyed reaction`);
    queries.push(`${ww} unimpressed reaction`);
  }

  if (mood === "playful") {
    queries.push(`${ww} playful reaction`);
    queries.push(`${ww} smug reaction`);
  }

  if (mood === "curious") {
    queries.push(`${ww} curious reaction`);
  }

  if (mood === "warm") {
    queries.push(`${ww} warm smile reaction`);
    queries.push(`${ww} gentle reaction`);
  }

  if (mood === "cold" || mood === "guarded") {
    queries.push(`${ww} cold stare reaction`);
    queries.push(`${ww} serious stare reaction`);
  }

  queries.push(`${charName} wuthering waves reaction gif`);
  queries.push(`${charName} wuthering waves reaction`);
  queries.push(`${charName} wuwa reaction`);
  queries.push(`${charName} wuwa gif`);
  queries.push(`${charName} ${ww} reaction`);
  queries.push(`${charName} ${ww} gif`);
  queries.push(`${charName} ${ww} meme`);
  queries.push(`${ww} character reaction gif`);
  queries.push(`${ww} reaction`);
  queries.push(`${ww} gif`);

  return [...new Set(queries)];
}

async function chooseGifForAiReply(args: {
  origin: string;
  character: CharacterRow;
  userMessage: string;
  replyText: string;
  mood: string;
  vision: VisionAnalysis | null;
}) {
  const { origin, character, userMessage, replyText, mood, vision } = args;

  const queries = buildGifQueries({
    character,
    userMessage,
    replyText,
    mood,
    vision,
  });

  for (const query of queries) {
    try {
      const res = await fetch(
        `${origin}/api/giphy/search?q=${encodeURIComponent(query)}&limit=15`,
        { cache: "no-store" }
      );

      if (!res.ok) continue;

      const data = (await res.json()) as GiphySearchResponse;
      const gifs = Array.isArray(data.gifs) ? data.gifs.filter((g) => g?.url) : [];
      if (!gifs.length) continue;

      if (vision?.recognizedCharacter) {
        const characterMatch = gifs.find((g) => {
          const title = String(g.title ?? "").toLowerCase();
          return title.includes(vision.recognizedCharacter!.toLowerCase());
        });
        if (characterMatch) return characterMatch;
      }

      const strictCharacterMatch = gifs.find((g) => {
        const title = String(g.title ?? "").toLowerCase();
        return (
          title.includes(character.name.toLowerCase()) &&
          (title.includes("wuthering") ||
            title.includes("waves") ||
            title.includes("wuwa"))
        );
      });

      if (strictCharacterMatch) return strictCharacterMatch;

      const strictWuwaMatch = gifs.find((g) => {
        const title = String(g.title ?? "").toLowerCase();
        return title.includes("wuthering") || title.includes("waves") || title.includes("wuwa");
      });

      if (strictWuwaMatch) return strictWuwaMatch;
    } catch (error) {
      console.error("[chat-gif-search-error]", error);
    }
  }

  return null;
}

async function getReplyBundleAfterUserMessage(args: {
  supabase: ReturnType<typeof createAdminClient>;
  threadId: string;
  userMessageCreatedAt: string;
}) {
  const { supabase, threadId, userMessageCreatedAt } = args;

  const { data, error } = await supabase
    .from("chat_messages")
    .select(`
      id,
      thread_id,
      sender_role,
      content,
      created_at,
      message_type,
      sticker_id,
      gif_url,
      resolved_name,
      resolved_avatar,
      sticker:stickers (
        id,
        key,
        label,
        image_path
      )
    `)
    .eq("thread_id", threadId)
    .eq("sender_role", "contact")
    .gt("created_at", userMessageCreatedAt)
    .order("created_at", { ascending: true })
    .limit(5);

  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    thread_id: row.thread_id,
    sender_role: row.sender_role,
    content: row.content,
    created_at: row.created_at,
    message_type: row.message_type ?? "text",
    sticker_id: row.sticker_id ?? null,
    gif_url: row.gif_url ?? null,
    resolved_name: row.resolved_name ?? null,
    resolved_avatar: row.resolved_avatar ?? null,
    sticker: Array.isArray(row.sticker) ? row.sticker[0] ?? null : row.sticker,
  })) as MessageRow[];

  return {
    replyMessage: rows.find((m) => m.message_type === "text") ?? null,
    stickerReplyMessage: rows.find((m) => m.message_type === "sticker") ?? null,
    gifReplyMessage: rows.find((m) => m.message_type === "gif") ?? null,
  };
}

async function findRecentDuplicateUserMessage(args: {
  supabase: ReturnType<typeof createAdminClient>;
  threadId: string;
  content: string;
}) {
  const { supabase, threadId, content } = args;

  const { data, error } = await supabase
    .from("chat_messages")
    .select(`
      id,
      thread_id,
      sender_role,
      content,
      created_at,
      message_type,
      sticker_id,
      gif_url,
      resolved_name,
      resolved_avatar,
      sticker:stickers (
        id,
        key,
        label,
        image_path
      )
    `)
    .eq("thread_id", threadId)
    .eq("sender_role", "active")
    .eq("message_type", "text")
    .eq("content", content)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw new Error(error.message);

  const rows = ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    thread_id: row.thread_id,
    sender_role: row.sender_role,
    content: row.content,
    created_at: row.created_at,
    message_type: row.message_type ?? "text",
    sticker_id: row.sticker_id ?? null,
    gif_url: row.gif_url ?? null,
    resolved_name: row.resolved_name ?? null,
    resolved_avatar: row.resolved_avatar ?? null,
    sticker: Array.isArray(row.sticker) ? row.sticker[0] ?? null : row.sticker,
  })) as MessageRow[];

  return rows.find((row) => isWithinWindow(row.created_at, DUPLICATE_MESSAGE_WINDOW_MS)) ?? null;
}

async function insertOrReuseUserMessage(args: {
  supabase: ReturnType<typeof createAdminClient>;
  threadId: string;
  content: string;
}) {
  const duplicate = await findRecentDuplicateUserMessage(args);

  if (duplicate) {
    return {
      savedUserMessage: duplicate,
      reusedExistingUserMessage: true,
    };
  }

  const savedUserMessage = await insertTextMessage({
    supabase: args.supabase,
    threadId: args.threadId,
    senderRole: "active",
    content: args.content,
  });

  return {
    savedUserMessage,
    reusedExistingUserMessage: false,
  };
}

async function shouldSkipDuplicateReply(args: {
  supabase: ReturnType<typeof createAdminClient>;
  threadId: string;
  justSavedUserMessageCreatedAt: string;
}) {
  const { supabase, threadId, justSavedUserMessageCreatedAt } = args;

  const existingReplyBundle = await getReplyBundleAfterUserMessage({
    supabase,
    threadId,
    userMessageCreatedAt: justSavedUserMessageCreatedAt,
  });

  return {
    shouldSkip:
      !!existingReplyBundle.replyMessage ||
      !!existingReplyBundle.stickerReplyMessage ||
      !!existingReplyBundle.gifReplyMessage,
    existingReplyBundle,
  };
}

async function hasRecentGifForThread(args: {
  supabase: ReturnType<typeof createAdminClient>;
  threadId: string;
  gifUrl?: string | null;
}) {
  const { supabase, threadId, gifUrl } = args;

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, gif_url, created_at")
    .eq("thread_id", threadId)
    .eq("sender_role", "contact")
    .eq("message_type", "gif")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{
    id: string;
    gif_url: string | null;
    created_at: string;
  }>;

  const recentRows = rows.filter((row) => isWithinWindow(row.created_at, GIF_DUPLICATE_WINDOW_MS));
  if (!recentRows.length) return false;

  if (!gifUrl) return true;

  return recentRows.some((row) => row.gif_url === gifUrl);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const threadId = String(body.threadId ?? "").trim();
    const message = String(body.message ?? "").trim();
    const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
    const imageDataUrl =
      typeof body.imageDataUrl === "string" ? body.imageDataUrl.trim() : "";
    const visualInput = imageDataUrl || imageUrl;
    const mediumHint =
      body.medium === "gif" || body.medium === "image" ? body.medium : "unknown";

    if (!threadId || !message) {
      return NextResponse.json(
        { error: "Missing threadId or message." },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing DEEPSEEK_API_KEY." },
        { status: 500 }
      );
    }

    const {
      supabase,
      activeCharacter,
      contactCharacter,
      messages,
      relationship,
    } = await getThreadData(threadId);

    const existingRuntimeState = await getThreadRuntimeState(threadId);

    const seededState = existingRuntimeState
      ? {
          affinity: existingRuntimeState.affinity,
          annoyance: existingRuntimeState.annoyance,
          trust: existingRuntimeState.trust,
          familiarity: existingRuntimeState.familiarity,
          mood: existingRuntimeState.mood,
          blocked: existingRuntimeState.blocked,
          messageCount: existingRuntimeState.message_count,
          lastStickerAt: (existingRuntimeState as any).last_sticker_at ?? null,
        }
      : {
          ...seedRuntimeStateFromRelationship(relationship),
          lastStickerAt: null,
        };

    const alreadyBlockedState = applyBlockingRule({
      state: seededState,
      annoyanceThreshold: contactCharacter.annoyance_threshold ?? 85,
    });

    if (alreadyBlockedState.blocked) {
      await upsertThreadRuntimeState({
        threadId,
        affinity: alreadyBlockedState.affinity,
        annoyance: alreadyBlockedState.annoyance,
        trust: alreadyBlockedState.trust,
        familiarity: alreadyBlockedState.familiarity,
        mood: alreadyBlockedState.mood,
        blocked: true,
        messageCount: alreadyBlockedState.messageCount,
      });

      return NextResponse.json(
        {
          error: contactCharacter.block_message || "This conversation is over.",
          blocked: true,
        },
        { status: 403 }
      );
    }

    const { savedUserMessage, reusedExistingUserMessage } = await insertOrReuseUserMessage({
      supabase,
      threadId,
      content: message,
    });

    const skipDuplicateReply = await shouldSkipDuplicateReply({
      supabase,
      threadId,
      justSavedUserMessageCreatedAt: savedUserMessage.created_at,
    });

    if (skipDuplicateReply.shouldSkip) {
      return NextResponse.json({
        ok: true,
        reusedExistingUserMessage,
        skipped: true,
        savedUserMessage,
        replyMessage: skipDuplicateReply.existingReplyBundle.replyMessage,
        stickerReplyMessage: skipDuplicateReply.existingReplyBundle.stickerReplyMessage,
        gifReplyMessage: skipDuplicateReply.existingReplyBundle.gifReplyMessage,
      });
    }

    const nextRuntimeState = deriveNextThreadRuntimeState(seededState, message);

    await upsertThreadRuntimeState({
      threadId,
      affinity: nextRuntimeState.affinity,
      annoyance: nextRuntimeState.annoyance,
      trust: nextRuntimeState.trust,
      familiarity: nextRuntimeState.familiarity,
      mood: nextRuntimeState.mood,
      blocked: nextRuntimeState.blocked,
      messageCount: nextRuntimeState.messageCount,
    });

    const updatedHistory = [...messages, savedUserMessage].slice(-MAX_HISTORY);

    let visionAnalysis: VisionAnalysis | null = null;
    let visionUsage: any = null;

    if (visualInput) {
      const openAIApiKey = process.env.OPENAI_API_KEY;
      if (openAIApiKey) {
        try {
          const visionPass = await callOpenAIVision({
            apiKey: openAIApiKey,
            imageUrl: visualInput,
            mediumHint,
          });

          if (visionPass.ok) {
            visionAnalysis = visionPass.analysis;
            visionUsage = visionPass.data?.usage ?? null;

            logTokenUsage({
              stage: "vision-pass",
              model: DEFAULT_OPENAI_VISION_MODEL,
              threadId,
              character: contactCharacter.name,
              usage: visionUsage,
            });
          } else {
            console.error("[openai-vision-error]", visionPass.data);
          }
        } catch (error) {
          console.error("[openai-vision-pass-error]", error);
        }
      }
    }

    const plannerCharacter = mapDbCharacterToPlannerProfile(contactCharacter);
    const plannerRelationship = buildPlannerRelationshipState(nextRuntimeState);
    const history = buildHistory(updatedHistory);

    const detectedCharacterName =
      visionAnalysis?.recognizedCharacter ??
      (visionAnalysis as any)?.possibleCharacter ??
      null;

    const detectedRelationship =
      visualInput && detectedCharacterName
        ? await findRelationshipWithDetectedCharacter({
            supabase,
            contactCharacterId: contactCharacter.id,
            detectedCharacterName,
          })
        : null;

    const explicitFactionName = detectFactionNameFromText(message);
    const inferredFactionName = !explicitFactionName && isFactionFollowupQuestion(message)
      ? inferFactionNameFromRecentHistory(updatedHistory)
      : null;
    const effectiveFactionName = explicitFactionName || inferredFactionName;
    const effectiveMessage =
      effectiveFactionName && inferredFactionName && !explicitFactionName
        ? `${message} (${effectiveFactionName})`
        : message;

    let factualAnswer = await getDirectFactualAnswer(effectiveMessage, contactCharacter);

    let forcedDirectReply: string | null = null;
    let forcedFacts: string | null = null;

    if (!factualAnswer.answered && effectiveFactionName && isFactionFollowupQuestion(message)) {
      const factionRow = await fetchFactionByNameDirect({
        supabase,
        factionName: effectiveFactionName,
      });
      const members = parseFactionMembers(factionRow?.members);
      if (factionRow && members.length) {
        forcedFacts = `Question type: faction\nFaction: ${factionRow.name}\nMembers: ${members.join(", ")}`;
        forcedDirectReply = buildFactionMembersReply({
          factionName: factionRow.name,
          members,
        });
        factualAnswer = {
          answered: true,
          kind: "faction",
          facts: forcedFacts,
          directReply: forcedDirectReply,
          debug: {
            route: "factual",
            kind: "faction",
            matched: { faction: factionRow.name },
            facts: forcedFacts,
            reply: forcedDirectReply,
          },
        };
      }
    }

   if (!factualAnswer.answered && isRegionListQuestion(message)) {
  console.log("\n[REGION DETECTED] message =", message);

  const regionNames = await fetchAllRegionsDirect({ supabase });

  console.log("[REGION FETCH RESULT] =", regionNames);

  if (regionNames.length) {
    forcedFacts = `Question type: region list\nRegions: ${regionNames.join(", ")}`;
    forcedDirectReply = buildRegionListReply(regionNames);

    console.log("[REGION FACTS BUILT] =", forcedFacts);
    console.log("[REGION DIRECT REPLY] =", forcedDirectReply);

    factualAnswer = {
      answered: true,
      kind: "region",
      facts: forcedFacts,
      directReply: forcedDirectReply,
      debug: {
        route: "factual",
        kind: "region",
        matched: { region: "Solaris-3" },
        facts: forcedFacts,
        reply: forcedDirectReply,
      },
    };
  } else {
    console.log("[REGION FETCH EMPTY ❌]");
  }
}

    const loreResult =
      factualAnswer.answered
        ? { context: "", debug: null as any }
        : await getLoreContextForCharacter(contactCharacter.key, effectiveMessage);

    const needsEventContext = !factualAnswer.answered && shouldIncludeEventContext(message, visionAnalysis);
    const needsMonsterContext = !factualAnswer.answered && shouldIncludeMonsterContext(message);

    const [events, monsters] = await Promise.all([
      needsEventContext
        ? getRelevantEventsForCharacter({
            characterKey: contactCharacter.key,
            limit: 3,
          })
        : Promise.resolve([]),
      needsMonsterContext
        ? searchRelevantMonsters({
            message,
            limit: 3,
          })
        : Promise.resolve([]),
    ]);

    const factualContext = buildFactualContextBlock({
  factual: factualAnswer,
});

console.log("\n[FACTUAL ANSWER FINAL] =", factualAnswer);
console.log("[FACTUAL CONTEXT BLOCK] =", factualContext);
    const retrievedLoreContext = loreResult.context || "";
    const eventContext = needsEventContext ? buildEventContextBlock(events) : "";
    const monsterContext = needsMonsterContext ? buildMonsterContextBlock(monsters, message) : "";
    const visualContext = visualInput
      ? buildVisualContextBlock({
          vision: visionAnalysis,
          activeCharacter,
          contactCharacter,
          detectedRelationship,
        })
      : "";

    const worldContext = buildWorldContext({
      activeCharacter,
      contactCharacter,
      runtimeState: nextRuntimeState,
      factualContext,
      retrievedLoreContext,
      eventContext,
      monsterContext,
      visualContext,
    });

    const { plan, prompt, memorySummary, modelSettings } =
      createReplyPlannerPrompt({
        message: effectiveMessage,
        history,
        relationship: plannerRelationship,
        character: plannerCharacter,
        worldContext,
        extraCharacterContext: {
          identityNotes: contactCharacter.identity_notes,
          conversationRules: contactCharacter.conversation_rules,
          relationshipBehavior: contactCharacter.relationship_behavior,
          loreContext: contactCharacter.lore_context,
          hardConstraints: contactCharacter.hard_constraints,
        },
      });

    const model = DEFAULT_MODEL;
    const factualAwareTemperature = factualAnswer.answered
      ? Math.min(modelSettings.temperature, 0.55)
      : modelSettings.temperature;
    const factualAwareMaxTokens = factualAnswer.answered
      ? Math.max(modelSettings.maxTokens, 140)
      : modelSettings.maxTokens;

    const firstPass = await callDeepSeek({
      apiKey,
      model,
      prompt,
      temperature: factualAwareTemperature,
      topP: modelSettings.topP,
      maxTokens: factualAwareMaxTokens,
    });

    logTokenUsage({
      stage: "first-pass",
      model,
      threadId,
      character: contactCharacter.name,
      usage: firstPass.data?.usage,
    });

    if (!firstPass.response.ok) {
      console.error("[deepseek-error:first-pass]", firstPass.data);
      return NextResponse.json(
        {
          error: firstPass.data?.error?.message || "DeepSeek request failed.",
        },
        { status: firstPass.response.status }
      );
    }

    let reply = firstPass.reply;
    console.log("\n[MODEL RAW REPLY BEFORE FIX] =", reply);
    let repaired = false;
    let repairUsage: OpenRouterResponse["usage"] | undefined;

    if (isWeakCharacterReply(reply) || (visualInput && replyDeniesSeenCharacter(reply))) {
      const repairPrompt = buildRepairPrompt({
        badReply: reply,
        plan,
        character: plannerCharacter,
        userMessage: message,
        visualContext,
      });

      const secondPass = await callDeepSeek({
        apiKey,
        model,
        prompt: repairPrompt,
        temperature: Math.min(modelSettings.temperature + 0.06, 0.92),
        topP: modelSettings.topP,
        maxTokens: modelSettings.maxTokens,
      });

      repairUsage = secondPass.data?.usage;

      logTokenUsage({
        stage: "repair-pass",
        model,
        threadId,
        character: contactCharacter.name,
        usage: secondPass.data?.usage,
      });

      if (secondPass.response.ok) {
        const retryReply = secondPass.reply;
        if (retryReply && !isWeakCharacterReply(retryReply)) {
          reply = retryReply;
          repaired = true;
        }
      } else {
        console.error("[deepseek-error:repair-pass]", secondPass.data);
      }
    }

  if (factualAnswer.answered && shouldLockDirectFactualReply(factualAnswer) && factualAnswer.directReply) {
  reply = factualAnswer.directReply;
}
    logCombinedTokenUsage({
      model,
      threadId,
      character: contactCharacter.name,
      firstUsage: firstPass.data?.usage,
      repairUsage,
      visionUsage,
    });

    const preFinalRuntimeState = applyAssistantReplyEffects(nextRuntimeState, reply);

    const finalRuntimeState = applyBlockingRule({
      state: preFinalRuntimeState,
      annoyanceThreshold: contactCharacter.annoyance_threshold ?? 85,
    });

    if (finalRuntimeState.blocked) {
      reply =
        contactCharacter.block_message ||
        "This conversation is over. Do not message me again.";
    }

    const resolvedForm = resolveActiveForm(contactCharacter, finalRuntimeState.mood);

    const replyMessage = await insertTextMessage({
      supabase,
      threadId,
      senderRole: "contact",
      content: reply,
      resolvedName: resolvedForm.name !== contactCharacter.name ? resolvedForm.name : null,
      resolvedAvatar: resolvedForm.avatar,
    });

    let stickerReplyMessage: MessageRow | null = null;
    let gifReplyMessage: MessageRow | null = null;

    if (!finalRuntimeState.blocked && replyMessage.content) {
      const stickerChoice = await chooseStickerForAiReply({
        userMessage: message,
        replyText: replyMessage.content,
        mood: finalRuntimeState.mood,
        lastStickerAt: (seededState as any).lastStickerAt ?? null,
        stickerEnabled: contactCharacter.sticker_enabled ?? false,
        stickerBaseChance: Number(contactCharacter.sticker_base_chance ?? 0.12),
        stickerMoodInfluence: Number(contactCharacter.sticker_mood_influence ?? 0.12),
      });

      if (stickerChoice) {
        try {
          stickerReplyMessage = await insertStickerMessage({
            supabase,
            threadId,
            senderRole: "contact",
            stickerId: stickerChoice.id,
            resolvedName: resolvedForm.name !== contactCharacter.name ? resolvedForm.name : null,
            resolvedAvatar: resolvedForm.avatar,
          });

          const { error: stickerStateError } = await supabase
            .from("chat_thread_states")
            .update({
              last_sticker_at: new Date().toISOString(),
            })
            .eq("thread_id", threadId);

          if (stickerStateError) {
            console.error("[chat-sticker-state-error]", stickerStateError);
          }
        } catch (stickerError) {
          console.error("[chat-sticker-reply-error]", stickerError);
        }
      }

      const origin = new URL(req.url).origin;
      const gifChoice = await chooseGifForAiReply({
        origin,
        character: contactCharacter,
        userMessage: message,
        replyText: replyMessage.content,
        mood: finalRuntimeState.mood,
        vision: visionAnalysis,
      });

      const canSendGif =
        !!gifChoice &&
        !(await hasRecentGifForThread({
          supabase,
          threadId,
          gifUrl: gifChoice?.url ?? null,
        }));

      if (gifChoice && canSendGif) {
        try {
          gifReplyMessage = await insertGifMessage({
            supabase,
            threadId,
            senderRole: "contact",
            gifUrl: gifChoice.url,
            gifTitle: gifChoice.title ?? null,
            resolvedName: resolvedForm.name !== contactCharacter.name ? resolvedForm.name : null,
            resolvedAvatar: resolvedForm.avatar,
          });
        } catch (gifError) {
          console.error("[chat-gif-reply-error]", gifError);
        }
      }
    }

    await upsertThreadRuntimeState({
      threadId,
      affinity: finalRuntimeState.affinity,
      annoyance: finalRuntimeState.annoyance,
      trust: finalRuntimeState.trust,
      familiarity: finalRuntimeState.familiarity,
      mood: finalRuntimeState.mood,
      blocked: finalRuntimeState.blocked,
      messageCount: finalRuntimeState.messageCount,
    });

    return NextResponse.json({
      ok: true,
      reusedExistingUserMessage,
      repaired,
      blocked: finalRuntimeState.blocked,
      resolvedName: resolvedForm.name,
      resolvedAvatar: resolvedForm.avatar,
      blockMessage: finalRuntimeState.blocked
        ? contactCharacter.block_message || "This conversation is over."
        : null,
      savedUserMessage,
      replyMessage,
      stickerReplyMessage,
      gifReplyMessage,
      debug: {
        plan,
        runtimeState: finalRuntimeState,
        relationship: plannerRelationship,
        memorySummary,
        modelSettings,
        activeCharacter: activeCharacter.name,
        contactCharacter: contactCharacter.name,
        vision: visionAnalysis,
        includedContext: {
          factual: factualAnswer.answered,
          lore: !!retrievedLoreContext,
          events: needsEventContext,
          monsters: needsMonsterContext,
          visual: !!visualInput,
        },
        factual: factualAnswer.answered ? factualAnswer.debug : null,
        lore: loreResult.debug ?? null,
        events: events.map((e) => ({
          title: e.title,
          importance: e.importance,
        })),
        monsters: monsters.map((m) => ({
          name: m.name,
          class: m.class,
          element: m.element,
          location: m.location,
        })),
        tokenUsage: {
          visionPass: visionUsage ?? null,
          firstPass: firstPass.data?.usage ?? null,
          repairPass: repairUsage ?? null,
          combined: {
            prompt_tokens:
              (visionUsage?.prompt_tokens ?? visionUsage?.input_tokens ?? 0) +
              (firstPass.data?.usage?.prompt_tokens ?? 0) +
              (repairUsage?.prompt_tokens ?? 0),
            completion_tokens:
              (visionUsage?.completion_tokens ?? visionUsage?.output_tokens ?? 0) +
              (firstPass.data?.usage?.completion_tokens ?? 0) +
              (repairUsage?.completion_tokens ?? 0),
            total_tokens:
              (visionUsage?.total_tokens ?? 0) +
              (firstPass.data?.usage?.total_tokens ?? 0) +
              (repairUsage?.total_tokens ?? 0),
          },
        },
      },
    });
  } catch (error) {
    console.error("[chat-api-error]", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}