import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
import {
  createReplyPlannerPrompt,
  normalizeModelReply,
  isWeakCharacterReply,
  buildRepairPrompt,
} from "@/lib/chat/reply-orchestrator";
import { plannerProfiles } from "@/lib/chat/planner-config";

type CharacterRow = {
  id: string;
  key: string;
  name: string;
  title: string | null;
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

type VisionAnalysis = {
  hasVisual: boolean;
  medium: "image" | "gif" | "unknown";
  recognizedCharacter: string | null;
  possibleCharacter?: string | null;
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
  process.env.OPENAI_VISION_MODEL || "gpt-4.1";

const MAX_HISTORY = 18;
const DUPLICATE_GIF_WINDOW_MS = 180_000;

const WATERMARK_TOKENS = [
  "tybwaizen",
  "tybw_aizen",
  "@tybw_aizen",
  "@tybwaizen",
];

function arr(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function extractReply(data: OpenRouterResponse): string {
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

function isWithinWindow(isoDate: string, windowMs: number) {
  const time = new Date(isoDate).getTime();
  if (Number.isNaN(time)) return false;
  return Date.now() - time <= windowMs;
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

function normalizeLoose(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeSearchText(value: string | null | undefined) {
  return normalizeLoose(value);
}

function isPrefixMatch(a: string, b: string) {
  if (!a || !b) return false;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  if (shorter.length < 2) return false;
  return longer.startsWith(shorter);
}

function isBroadSearchQuery(q: string) {
  const query = normalizeLoose(q);
  return new Set([
    "wuwa",
    "wuthering waves",
    "wuthering",
    "waves",
    "anime",
    "game",
    "gif",
    "reaction",
    "character",
  ]).has(query);
}

function isStrongCharacterSearchMatch(search: string, activeName: string) {
  const s = normalizeLoose(search);
  const a = normalizeLoose(activeName);

  if (!s || !a) return false;
  if (isBroadSearchQuery(s)) return false;
  if (s === a) return true;
  if (s.length >= 4 && a.startsWith(s)) return true;

  return false;
}

function sanitizeGifTitle(title: string | null | undefined) {
  const raw = String(title ?? "").trim();
  if (!raw) return "";

  const lower = raw.toLowerCase();

  if (
    new Set(["gif", "ww gif", "wuthering waves gif", "reaction gif"]).has(lower)
  ) {
    return "";
  }

  let cleaned = raw.replace(/\bgif\b/gi, "").trim();

  cleaned = cleaned
    .replace(/\bby\s+[\w.-]+\b/gi, "")
    .replace(/\bedit\s+by\s+[\w.-]+\b/gi, "")
    .replace(/\bsource\s*:\s*[\w.-]+\b/gi, "")
    .trim();

  if (/^[@#][\w.-]+$/i.test(cleaned)) return "";
  if (/^[a-z0-9._-]{3,24}$/i.test(cleaned) && !cleaned.includes(" ")) return "";

  return cleaned;
}

function containsWatermarkToken(value: string | null | undefined) {
  const text = String(value ?? "").toLowerCase();
  return WATERMARK_TOKENS.some((token) => text.includes(token));
}

function isLikelyWatermarkToken(value: string | null | undefined) {
  const v = String(value ?? "").trim();
  if (!v) return false;

  const lower = v.toLowerCase();

  if (
    lower.includes("tybwaizen") ||
    lower.includes("watermark") ||
    lower.includes("source") ||
    lower.includes("edit")
  ) {
    return true;
  }

  if (/^[a-z0-9._-]{3,24}$/i.test(v) && !v.includes(" ")) {
    return true;
  }

  return false;
}

function isGenericPossibleCharacter(value: string | null | undefined) {
  const v = normalizeLoose(value);
  if (!v) return true;

  return (
    v.includes("character with") ||
    v.includes("female character") ||
    v.includes("male character") ||
    v.includes("elf-eared") ||
    v.includes("blue-haired") ||
    v.includes("blonde") ||
    v.includes("armored") ||
    v.includes("long hair")
  );
}

function normalizeVisionAnalysis(
  input: Partial<VisionAnalysis> | null | undefined
): VisionAnalysis {
  const confidence =
    input?.confidence === "high" ||
    input?.confidence === "medium" ||
    input?.confidence === "low"
      ? input.confidence
      : "low";

  const medium =
    input?.medium === "image" ||
    input?.medium === "gif" ||
    input?.medium === "unknown"
      ? input.medium
      : "unknown";

  return {
    hasVisual: Boolean(input?.hasVisual),
    medium,
    recognizedCharacter:
      typeof input?.recognizedCharacter === "string" &&
      input.recognizedCharacter.trim()
        ? input.recognizedCharacter.trim()
        : null,
    possibleCharacter:
      typeof input?.possibleCharacter === "string" &&
      input.possibleCharacter.trim()
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
      typeof (input as any)?.expression === "string" && (input as any).expression.trim()
        ? (input as any).expression.trim()
        : null,
    confidence,
    conciseSummary:
      typeof input?.conciseSummary === "string" && input.conciseSummary.trim()
        ? input.conciseSummary.trim()
        : null,
    rawText:
      typeof input?.rawText === "string" && input.rawText.trim()
        ? input.rawText.trim()
        : null,
  };
}

function scrubVisionWatermarks(vision: VisionAnalysis | null): VisionAnalysis | null {
  if (!vision) return vision;

  return {
    ...vision,
    recognizedCharacter:
      containsWatermarkToken(vision.recognizedCharacter) ||
      isLikelyWatermarkToken(vision.recognizedCharacter)
        ? null
        : vision.recognizedCharacter,
    possibleCharacter:
      containsWatermarkToken(vision.possibleCharacter) ||
      isLikelyWatermarkToken(vision.possibleCharacter) ||
      isGenericPossibleCharacter(vision.possibleCharacter)
        ? null
        : vision.possibleCharacter ?? null,
  };
}

function scrubReplyWatermarks(reply: string) {
  let cleaned = reply;

  cleaned = cleaned.replace(
    /^\s*(tybwaizen|tybw_aizen|@tybw_aizen|@tybwaizen)\s*,?\s*(then\.)?\s*/i,
    ""
  );

  cleaned = cleaned.replace(
    /(^|[\s.])([^.!?]*(tybwaizen|tybw_aizen|@tybw_aizen|@tybwaizen)[^.!?]*[.!?])/gi,
    " "
  );

  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();

  if (!cleaned) return "An interesting choice.";

  return cleaned;
}

function stripSeriesMentionFromReply(reply: string) {
  let cleaned = reply;

  cleaned = cleaned.replace(
    /\b(it('| i)?s|that('| i)?s|this is|this looks like|looks like)\s+(from\s+)?wuthering\s+waves\b[,.!?]*/gi,
    ""
  );

  cleaned = cleaned.replace(/\bfrom\s+wuthering\s+waves\b[,.!?]*/gi, "");
  cleaned = cleaned.replace(/\bwuthering\s+waves\b[,.!?]*/gi, "");
  cleaned = cleaned.replace(/\s{2,}/g, " ").trim();
  cleaned = cleaned.replace(/^[,.\-:;\s]+/, "").trim();

  if (!cleaned) return "An interesting choice.";

  return cleaned;
}

function replyDeniesSeenCharacter(reply: string) {
  const text = normalizeLoose(reply);

  return (
    text.includes("that is not me") ||
    text.includes("that's not me") ||
    text.includes("that isn't me") ||
    text.includes("that is not mine") ||
    text.includes("not me.") ||
    text === "not me"
  );
}

function doesVisionLikelyMatchCharacter(args: {
  character: CharacterRow;
  vision: VisionAnalysis | null;
  searchQuery?: string | null;
}) {
  const { character, vision, searchQuery } = args;
  if (!vision) return false;

  const characterName = normalizeLoose(character.name);
  const recognized = normalizeLoose(vision.recognizedCharacter);
  const possible = normalizeLoose(vision.possibleCharacter);
  const search = normalizeSearchText(searchQuery);

  if (recognized && recognized === characterName) return true;
  if (possible && possible === characterName) return true;
  if (search && isStrongCharacterSearchMatch(search, characterName)) return true;

  if (
    vision.series === "Wuthering Waves" &&
    !recognized &&
    !possible &&
    search &&
    isPrefixMatch(search, characterName) &&
    !isBroadSearchQuery(search)
  ) {
    return true;
  }

  if (
    vision.series === "Wuthering Waves" &&
    possible &&
    search &&
    isPrefixMatch(search, characterName) &&
    !isBroadSearchQuery(search)
  ) {
    return true;
  }

  return false;
}

function doesVisionLikelyMatchActiveCharacter(args: {
  activeCharacter: CharacterRow;
  vision: VisionAnalysis | null;
  searchQuery?: string | null;
}) {
  return doesVisionLikelyMatchCharacter({
    character: args.activeCharacter,
    vision: args.vision,
    searchQuery: args.searchQuery,
  });
}

function doesVisionLikelyMatchContactCharacter(args: {
  contactCharacter: CharacterRow;
  vision: VisionAnalysis | null;
  searchQuery?: string | null;
}) {
  return doesVisionLikelyMatchCharacter({
    character: args.contactCharacter,
    vision: args.vision,
    searchQuery: args.searchQuery,
  });
}

function buildOtherCharacterLead(args: {
  vision: VisionAnalysis | null;
  activeCharacter: CharacterRow;
  contactCharacter: CharacterRow;
}) {
  const { vision, activeCharacter, contactCharacter } = args;
  if (!vision) return null;

  const activeName = normalizeLoose(activeCharacter.name);
  const contactName = normalizeLoose(contactCharacter.name);
  const recognized = normalizeLoose(vision.recognizedCharacter);
  const possible = normalizeLoose(vision.possibleCharacter);

  if (
    recognized &&
    recognized !== activeName &&
    recognized !== contactName &&
    !isLikelyWatermarkToken(vision.recognizedCharacter)
  ) {
    return `${vision.recognizedCharacter}, then.`;
  }

  if (
    possible &&
    possible !== activeName &&
    possible !== contactName &&
    !isGenericPossibleCharacter(possible) &&
    !isLikelyWatermarkToken(vision.possibleCharacter)
  ) {
    return `${vision.possibleCharacter}, then.`;
  }

  return null;
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
  return messages.map((m) => {
    const content =
      m.message_type === "gif"
        ? `[GIF] ${m.content ?? ""}`.trim()
        : m.message_type === "sticker"
        ? `[STICKER] ${m.sticker?.label ?? ""}`.trim()
        : m.content ?? "";

    return {
      role: m.sender_role === "active" ? ("user" as const) : ("assistant" as const),
      content,
    };
  });
}

function buildVisualContextBlock(args: {
  vision: VisionAnalysis | null;
  searchQuery: string | null;
  activeCharacter: CharacterRow;
  contactCharacter: CharacterRow;
  shouldTreatAsActiveCharacter: boolean;
  shouldTreatAsContactCharacter: boolean;
}) {
  // Action-aware prompting for GIF replies.
  const {
    vision,
    searchQuery,
    activeCharacter,
    contactCharacter,
    shouldTreatAsActiveCharacter,
    shouldTreatAsContactCharacter,
  } = args;
  if (!vision || !vision.hasVisual) return "";

  const pieces: string[] = [];
  pieces.push("Visual attachment analysis is available.");
  pieces.push(`Visual medium: ${vision.medium}.`);
  pieces.push(`Visual confidence: ${vision.confidence}.`);

  if (searchQuery?.trim()) {
    pieces.push(`The user selected this GIF from search query: ${searchQuery.trim()}.`);
  }

  if (shouldTreatAsActiveCharacter) {
    pieces.push(`The attached GIF depicts ${activeCharacter.name}.`);
    pieces.push("Treat the GIF as the user showing themself.");
    pieces.push("Do not deny it.");
  } else if (shouldTreatAsContactCharacter) {
    pieces.push(`The attached GIF depicts you, ${contactCharacter.name}.`);
    pieces.push("Acknowledge it in first person.");
    pieces.push("Do not deny that it is you.");
  } else if (vision.recognizedCharacter) {
    pieces.push(`Recognized character: ${vision.recognizedCharacter}.`);
  } else if (vision.possibleCharacter) {
    pieces.push(`Possible character match: ${vision.possibleCharacter}.`);
  } else {
    pieces.push("No character identity was recognized confidently.");
  }

  if (vision.action) {
    pieces.push(`Visible action: ${vision.action}.`);
  }

  if (vision.expression) {
    pieces.push(`Visible expression or vibe: ${vision.expression}.`);
  }

  pieces.push("Ignore watermark text, editor handles, usernames, source tags, and overlay credits inside the image.");
  pieces.push("Never use watermark text or GIF metadata as a character name.");
  pieces.push("Do not answer like a classifier.");
  pieces.push("Do not explain the visual like a captioning system.");
  pieces.push("Do not mention the franchise, series, or game title unless the user explicitly asks what it is from.");

  if (shouldTreatAsActiveCharacter) {
    pieces.push("Acknowledge the user naturally as 'you' or by name.");
    pieces.push("If a visible action exists, briefly react to what they are doing or how they look in the GIF.");
  } else if (shouldTreatAsContactCharacter) {
    pieces.push("Acknowledge yourself naturally and briefly in first person.");
    pieces.push("If a visible action exists, briefly react in first person to what you are doing in the GIF.");
  } else {
    pieces.push("If this is likely some other character, acknowledge that character naturally and briefly.");
    pieces.push("Do not pretend that another character is the user.");
    pieces.push("If a visible action exists, mention what that character is doing in one short natural clause.");
  }

  pieces.push("Use the action as conversational awareness, not as a long description.");
  pieces.push("Keep the acknowledgment short and relational.");
  pieces.push("Then continue with the real in-character reply.");

  return pieces.join("\n");
}

function buildWorldContext(args: {
  activeCharacter: CharacterRow;
  contactCharacter: CharacterRow;
  relationship: RelationshipRow | null;
  runtimeState: {
    affinity: number;
    annoyance: number;
    trust: number;
    familiarity: number;
    mood: string;
    blocked: boolean;
    messageCount: number;
  };
  eventContext: string;
  monsterContext: string;
  visualContext: string;
  shouldTreatAsActiveCharacter: boolean;
  shouldTreatAsContactCharacter: boolean;
}) {
  const {
    activeCharacter,
    contactCharacter,
    relationship,
    runtimeState,
    eventContext,
    monsterContext,
    visualContext,
    shouldTreatAsActiveCharacter,
    shouldTreatAsContactCharacter,
  } = args;

  const pieces: string[] = [];

  pieces.push(
    `This is a one-on-one text chat app. The user is portraying ${activeCharacter.name}.`
  );
  pieces.push(
    `You are ${contactCharacter.name}. Speak directly to ${activeCharacter.name} in chat.`
  );
  pieces.push("Do not speak as an assistant.");
  pieces.push("Do not use markdown.");
  pieces.push("Do not narrate actions or roleplay stage directions.");
  pieces.push("Keep the reply natural, direct, and suited for chat.");
  pieces.push("The user's latest message was a GIF.");
  pieces.push("Never mention the franchise, series, or game title unless the user explicitly asks.");

  if (shouldTreatAsActiveCharacter) {
    pieces.push("The GIF shows the user themself in their portrayed form.");
    pieces.push("Do not identify them as if they were a separate third person.");
    pieces.push("Acknowledge them briefly and relationally.");
    pieces.push("If the GIF has a visible action or expression, react to that naturally.");
  } else if (shouldTreatAsContactCharacter) {
    pieces.push(`The GIF shows you, ${contactCharacter.name}.`);
    pieces.push("Acknowledge it naturally in first person.");
    pieces.push("Do not deny that it is you.");
    pieces.push("If the GIF has a visible action or expression, briefly react to what you are doing.");
  } else {
    pieces.push("The GIF likely shows another character, not the user.");
    pieces.push("If a likely character is available from vision, acknowledge them briefly and naturally.");
    pieces.push("Then respond relationally to why the user chose that character.");
    pieces.push("If a visible action or expression exists, mention it naturally so you show awareness of the GIF.");
    pieces.push("Never use GIF title metadata, watermark text, usernames, editor tags, or overlay credits as if they were character names.");
    pieces.push("If the image contains visible watermark text like a creator handle, ignore it completely.");
  }

  pieces.push("Do not over-describe the GIF.");
  pieces.push("Do not respond like a vision captioner.");
  pieces.push("One short mention of the visible action is enough.");

  if (contactCharacter.title) {
    pieces.push(`${contactCharacter.name}'s title: ${contactCharacter.title}.`);
  }

  if (relationship) {
    pieces.push(
      `${contactCharacter.name}'s stored relationship toward ${activeCharacter.name}: ` +
        `label=${relationship.relationship_label ?? "unspecified"}, ` +
        `affinity=${relationship.affinity}, trust=${relationship.trust}, familiarity=${relationship.familiarity}.`
    );

    if (relationship.notes?.trim()) {
      pieces.push(`Stored relationship notes: ${relationship.notes.trim()}`);
    }
  } else {
    pieces.push(
      `${contactCharacter.name} has no stored relationship entry toward ${activeCharacter.name}.`
    );
  }

  pieces.push(
    `Live thread state right now: affinity=${runtimeState.affinity}, annoyance=${runtimeState.annoyance}, trust=${runtimeState.trust}, familiarity=${runtimeState.familiarity}, mood=${runtimeState.mood}, blocked=${runtimeState.blocked}, message_count=${runtimeState.messageCount}.`
  );

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


function buildIdentityRepairPrompt(args: {
  originalPrompt: string;
  badReply: string;
  contactCharacter: CharacterRow;
  activeCharacter: CharacterRow;
  shouldTreatAsActiveCharacter: boolean;
  shouldTreatAsContactCharacter: boolean;
}) {
  const { originalPrompt, badReply, contactCharacter, activeCharacter, shouldTreatAsActiveCharacter, shouldTreatAsContactCharacter } = args;

  const correction = shouldTreatAsActiveCharacter
    ? `The GIF depicts ${activeCharacter.name}, the user. Do not deny that.`
    : shouldTreatAsContactCharacter
    ? `The GIF depicts you, ${contactCharacter.name}. Speak in first person and do not deny that it is you.`
    : "Keep the identity handling natural and grounded.";

  return `
Rewrite the reply so it stays fully in character and natural.

${correction}

Bad reply:
${badReply}

Return only the rewritten final chat reply.

Original instructions:
${originalPrompt}
`.trim();
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

async function callOpenAIVision(args: {
  apiKey: string;
  imageUrl: string;
  searchQuery?: string | null;
}) {
  const { apiKey, imageUrl, searchQuery } = args;

  const firstPrompt = `
Analyze this GIF or image carefully.

Return STRICT JSON only with this exact shape:
{
  "hasVisual": true,
  "medium": "gif",
  "recognizedCharacter": null,
  "possibleCharacter": string | null,
  "series": string | null,
  "action": string | null,
  "expression": string | null,
  "confidence": "high" | "medium" | "low",
  "conciseSummary": string | null
}

Rules:
- Do NOT force a character name.
- "recognizedCharacter" must stay null unless the identity is unmistakable.
- "possibleCharacter" may contain a tentative guess if there is one.
- If it appears to be from Wuthering Waves, set "series" to "Wuthering Waves".
- Ignore any visible watermark, editor credit, username, source tag, handle, or overlay text in the image.
- Never treat watermark text or creator names as character identities.
- Do not invent a weapon unless clearly visible.
- Do not invent lore, role, or personality.
- "action" should be a short visible-action phrase like "glancing aside", "smiling faintly", "raising a weapon", or "turning away".
- "expression" should be a very short mood/expression phrase like "calm", "smug", "melancholic", or "watchful" when visible.
- "conciseSummary" must be brief and visual-only.
`.trim();

  console.log("[vision-request]", {
    model: DEFAULT_OPENAI_VISION_MODEL,
    hasImageUrl: !!imageUrl,
    imageUrlPreview: imageUrl ? imageUrl.slice(0, 120) : null,
    searchQuery: searchQuery ?? null,
  });

  const firstResponse = await fetch(OPENAI_RESPONSES_URL, {
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
            { type: "input_text", text: firstPrompt },
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

  const firstData = await firstResponse.json();

  console.log("[vision-response-pass1]", {
    ok: firstResponse.ok,
    status: firstResponse.status,
    output_text: firstData?.output_text ?? null,
    usage: firstData?.usage ?? null,
    error: firstData?.error ?? null,
  });

  const firstOutputText =
    typeof firstData?.output_text === "string"
      ? firstData.output_text
      : Array.isArray(firstData?.output)
      ? firstData.output
          .flatMap((item: any) => (Array.isArray(item?.content) ? item.content : []))
          .map((c: any) => c?.text ?? "")
          .filter(Boolean)
          .join("\n")
      : "";

  const firstParsed = safeJsonParse<Partial<VisionAnalysis>>(firstOutputText, {
    hasVisual: true,
    medium: "gif",
    recognizedCharacter: null,
    possibleCharacter: null,
    series: null,
    action: null,
    expression: null,
    confidence: "low",
    conciseSummary: null,
  });

  let normalized = scrubVisionWatermarks(
    normalizeVisionAnalysis({
      ...firstParsed,
      rawText: firstOutputText || null,
    })
  );

  const normalizedSearch = normalizeSearchText(searchQuery);

  if (
    normalized?.series === "Wuthering Waves" &&
    normalizedSearch.includes("phrolova")
  ) {
    if (!normalized.recognizedCharacter) {
      normalized = {
        ...normalized,
        possibleCharacter: "Phrolova",
      };
    }

    if (normalized.recognizedCharacter === "Jinhsi") {
      normalized = {
        ...normalized,
        recognizedCharacter: null,
        possibleCharacter: "Phrolova",
        confidence: "medium",
      };
    }
  }

  console.log("[vision-parsed-analysis]", normalized);

  return {
    ok: firstResponse.ok,
    status: firstResponse.status,
    data: firstData,
    analysis: normalized,
  };
}

async function getReplyBundleAfterMessage(args: {
  supabase: ReturnType<typeof createAdminClient>;
  threadId: string;
  createdAt: string;
}) {
  const { supabase, threadId, createdAt } = args;

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
    .gt("created_at", createdAt)
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
    gifReplyMessage: rows.find((m) => m.message_type === "gif") ?? null,
  };
}

async function findRecentDuplicateGifMessage(args: {
  supabase: ReturnType<typeof createAdminClient>;
  threadId: string;
  gifUrl: string;
}) {
  const { supabase, threadId, gifUrl } = args;

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
    .eq("message_type", "gif")
    .eq("gif_url", gifUrl)
    .order("created_at", { ascending: false })
    .limit(3);

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

  return rows.find((row) => isWithinWindow(row.created_at, DUPLICATE_GIF_WINDOW_MS)) ?? null;
}

async function insertOrReuseGifMessage(args: {
  supabase: ReturnType<typeof createAdminClient>;
  threadId: string;
  gifUrl: string;
  gifTitle?: string | null;
}) {
  const duplicate = await findRecentDuplicateGifMessage({
    supabase: args.supabase,
    threadId: args.threadId,
    gifUrl: args.gifUrl,
  });

  if (duplicate) {
    return {
      savedGifMessage: duplicate,
      reusedExistingGifMessage: true,
    };
  }

  const savedGifMessage = await insertGifMessage({
    supabase: args.supabase,
    threadId: args.threadId,
    senderRole: "active",
    gifUrl: args.gifUrl,
    gifTitle: args.gifTitle ?? null,
  });

  return {
    savedGifMessage,
    reusedExistingGifMessage: false,
  };
}

async function shouldSkipDuplicateReply(args: {
  supabase: ReturnType<typeof createAdminClient>;
  threadId: string;
  justSavedUserMessageCreatedAt: string;
}) {
  const existingReplyBundle = await getReplyBundleAfterMessage({
    supabase: args.supabase,
    threadId: args.threadId,
    createdAt: args.justSavedUserMessageCreatedAt,
  });

  return {
    shouldSkip:
      !!existingReplyBundle.replyMessage || !!existingReplyBundle.gifReplyMessage,
    existingReplyBundle,
  };
}

export async function POST(req: Request) {
  try {
    console.log("[api/chat/gif] route hit");

    const body = await req.json();
    const threadId = String(body.threadId ?? "").trim();
    const gifUrl = String(body.gifUrl ?? "").trim();
    const gifTitle =
      typeof body.gifTitle === "string" ? body.gifTitle.trim() : null;
    const searchQuery =
      typeof body.searchQuery === "string" ? body.searchQuery.trim() : null;

    console.log("[api/chat/gif] incoming body", {
      threadId,
      hasGifUrl: !!gifUrl,
      gifUrlPreview: gifUrl ? gifUrl.slice(0, 120) : null,
      gifTitle,
      searchQuery,
    });

    if (!threadId || !gifUrl) {
      return NextResponse.json(
        { error: "Missing threadId or gifUrl." },
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
        }
      : seedRuntimeStateFromRelationship(relationship);

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

    const { savedGifMessage, reusedExistingGifMessage } = await insertOrReuseGifMessage({
      supabase,
      threadId,
      gifUrl,
      gifTitle,
    });

    const skipDuplicateReply = await shouldSkipDuplicateReply({
      supabase,
      threadId,
      justSavedUserMessageCreatedAt: savedGifMessage.created_at,
    });

    if (skipDuplicateReply.shouldSkip) {
      console.log("[reply-reused-existing]", {
        threadId,
        reusedExistingGifMessage,
        existingReplyMessage: !!skipDuplicateReply.existingReplyBundle.replyMessage,
        existingGifReplyMessage: !!skipDuplicateReply.existingReplyBundle.gifReplyMessage,
      });

      return NextResponse.json({
        ok: true,
        reusedExistingGifMessage,
        skipped: true,
        savedMessage: savedGifMessage,
        replyMessage: skipDuplicateReply.existingReplyBundle.replyMessage,
        gifReplyMessage: skipDuplicateReply.existingReplyBundle.gifReplyMessage,
      });
    }

    const safeGifTitle = sanitizeGifTitle(gifTitle);
    const messageForState = "[GIF]";

    const nextRuntimeState = deriveNextThreadRuntimeState(
      seededState,
      messageForState
    );

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

    let visionAnalysis: VisionAnalysis | null = null;
    let visionUsage: any = null;

    console.log("[vision-check]", {
      hasGifUrl: !!gifUrl,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      visionModel: DEFAULT_OPENAI_VISION_MODEL,
    });

    if (gifUrl && process.env.OPENAI_API_KEY) {
      try {
        const visionPass = await callOpenAIVision({
          apiKey: process.env.OPENAI_API_KEY,
          imageUrl: gifUrl,
          searchQuery,
        });

        if (visionPass.ok) {
          visionAnalysis = scrubVisionWatermarks(visionPass.analysis);
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
    } else if (!process.env.OPENAI_API_KEY) {
      console.warn("[vision-skipped] OPENAI_API_KEY missing");
    } else {
      console.warn("[vision-skipped] no gifUrl");
    }

    const shouldTreatAsActiveCharacter = doesVisionLikelyMatchActiveCharacter({
      activeCharacter,
      vision: visionAnalysis,
      searchQuery,
    });

    const shouldTreatAsContactCharacter = doesVisionLikelyMatchContactCharacter({
      contactCharacter,
      vision: visionAnalysis,
      searchQuery,
    });

    const updatedHistory = [...messages, savedGifMessage].slice(-MAX_HISTORY);

    const plannerCharacter = mapDbCharacterToPlannerProfile(contactCharacter);
    const plannerRelationship = buildPlannerRelationshipState(nextRuntimeState);
    const history = buildHistory(updatedHistory);

    const [events, monsters] = await Promise.all([
      getRelevantEventsForCharacter({
        characterKey: contactCharacter.key,
        limit: 5,
      }),
      searchRelevantMonsters({
        message: messageForState,
        limit: 5,
      }),
    ]);

    const eventContext = buildEventContextBlock(events);
    const monsterContext = buildMonsterContextBlock(monsters, messageForState);
    const visualContext = buildVisualContextBlock({
      vision: visionAnalysis,
      searchQuery,
      activeCharacter,
      contactCharacter,
      shouldTreatAsActiveCharacter,
      shouldTreatAsContactCharacter,
    });

    console.log("[vision-context-block]", visualContext || "(empty)");

    const worldContext = buildWorldContext({
      activeCharacter,
      contactCharacter,
      relationship,
      runtimeState: nextRuntimeState,
      eventContext,
      monsterContext,
      visualContext,
      shouldTreatAsActiveCharacter,
      shouldTreatAsContactCharacter,
    });

    const { plan, prompt, memorySummary, modelSettings } =
      createReplyPlannerPrompt({
        message: messageForState,
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

    const firstPass = await callDeepSeek({
      apiKey,
      model,
      prompt,
      temperature: modelSettings.temperature,
      topP: modelSettings.topP,
      maxTokens: modelSettings.maxTokens,
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
    let repaired = false;
    let repairUsage: OpenRouterResponse["usage"] | undefined;

    if (isWeakCharacterReply(reply)) {
      const repairPrompt = buildRepairPrompt({
        badReply: reply,
        plan,
        character: plannerCharacter,
        userMessage: messageForState,
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

    if (
      (shouldTreatAsActiveCharacter || shouldTreatAsContactCharacter) &&
      replyDeniesSeenCharacter(reply)
    ) {
      const identityRepairPrompt = buildIdentityRepairPrompt({
        originalPrompt: prompt,
        badReply: reply,
        contactCharacter,
        activeCharacter,
        shouldTreatAsActiveCharacter,
        shouldTreatAsContactCharacter,
      });

      const identityRepairPass = await callDeepSeek({
        apiKey,
        model,
        prompt: identityRepairPrompt,
        temperature: Math.min(modelSettings.temperature + 0.04, 0.88),
        topP: modelSettings.topP,
        maxTokens: modelSettings.maxTokens,
      });

      if (identityRepairPass.response.ok && identityRepairPass.reply) {
        reply = identityRepairPass.reply;
        repaired = true;
      } else {
        console.error("[deepseek-error:identity-repair]", identityRepairPass.data);
      }
    }

    const otherCharacterLead = buildOtherCharacterLead({
      vision: visionAnalysis,
      activeCharacter,
      contactCharacter,
    });

    if (!shouldTreatAsActiveCharacter && otherCharacterLead) {
      const lowerReply = reply.trim().toLowerCase();
      const lowerLead = otherCharacterLead.toLowerCase();

      if (!lowerReply.startsWith(lowerLead)) {
        reply = `${otherCharacterLead} ${reply}`.trim();
      }
    }

    reply = scrubReplyWatermarks(reply);
    reply = stripSeriesMentionFromReply(reply);

    logCombinedTokenUsage({
      model,
      threadId,
      character: contactCharacter.name,
      firstUsage: firstPass.data?.usage,
      repairUsage,
      visionUsage,
    });

    console.log("[reply-uses-vision]", {
      hasVisionAnalysis: !!visionAnalysis,
      recognizedCharacter: visionAnalysis?.recognizedCharacter ?? null,
      possibleCharacter: visionAnalysis?.possibleCharacter ?? null,
      action: visionAnalysis?.action ?? null,
      confidence: visionAnalysis?.confidence ?? null,
      shouldTreatAsActiveCharacter,
      shouldTreatAsContactCharacter,
      safeGifTitle,
      finalReplyPreview: reply.slice(0, 220),
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
      reusedExistingGifMessage,
      repaired,
      blocked: finalRuntimeState.blocked,
      savedMessage: savedGifMessage,
      replyMessage,
      gifReplyMessage: null,
      resolvedName: resolvedForm.name,
      resolvedAvatar: resolvedForm.avatar,
      blockMessage: finalRuntimeState.blocked
        ? contactCharacter.block_message || "This conversation is over."
        : null,
      debug: {
        plan,
        runtimeState: finalRuntimeState,
        relationship: plannerRelationship,
        memorySummary,
        modelSettings,
        vision: visionAnalysis,
        shouldTreatAsActiveCharacter,
        shouldTreatAsContactCharacter,
        safeGifTitle,
        otherCharacterLead,
      },
    });
  } catch (error) {
    console.error("[chat-gif-api-error]", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}