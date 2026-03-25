// lib/chat/reply-prompt.ts

import type {
  CharacterPlannerProfile,
  MessageLite,
  RelationshipState,
  ReplyPlan,
} from "./reply-planner";

type BuildPromptArgs = {
  character: CharacterPlannerProfile;
  relationship: RelationshipState;
  plan: ReplyPlan;
  message: string;
  memorySummary?: string;
  worldContext?: string;
  history?: MessageLite[];
};

function lengthInstruction(length: ReplyPlan["length"]) {
  if (length === "short") return "Keep it to 1-2 short sentences.";
  if (length === "medium") return "Keep it to 2-4 concise sentences.";
  return "Keep it concise even when longer: around 3-5 sentences max.";
}

function modeInstruction(mode: ReplyPlan["mode"]) {
  switch (mode) {
    case "direct_answer":
      return "Answer directly and clearly.";
    case "brief_answer":
      return "Answer with minimal fluff.";
    case "question_back":
      return "Reply naturally, then ask one relevant follow-up question.";
    case "tease_then_answer":
      return "Open with a light in-character tease, then answer.";
    case "comfort":
      return "Respond gently and emotionally aware, but still like normal chat.";
    case "deflect":
      return "Stay composed and redirect instead of fully accepting hostile framing.";
    case "guarded_answer":
      return "Answer while keeping some emotional distance.";
    case "lore_explain":
      return "Explain grounded facts naturally, not like a wiki.";
    case "challenge":
      return "Push back with confidence and edge.";
    case "romantic_soft":
      return "Respond softly and intimately while staying in character.";
    case "meta_boundary":
      return "Set a boundary or clarify role without sounding robotic.";
    case "observe_then_answer":
      return "Start with a brief observation, then answer.";
    default:
      return "Reply naturally.";
  }
}

function openerInstruction(opener: ReplyPlan["openerStyle"]) {
  switch (opener) {
    case "reaction":
      return "Start with a small human reaction.";
    case "observation":
      return "Start with a brief observation about the user's message.";
    case "softener":
      return "Start softly and empathetically.";
    default:
      return "Do not force a special opener.";
  }
}

export function buildGenerationPrompt(args: BuildPromptArgs) {
  const {
    character,
    relationship,
    plan,
    message,
    memorySummary,
    worldContext,
    history = [],
  } = args;

  const recentHistory = history
    .slice(-4)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  return [
    `You are ${character.name}. Reply in character as a natural chat message.`,
    `Style: tone=${character.baseTone ?? "neutral"}; notes=${(character.styleNotes ?? []).slice(0, 4).join(" | ") || "none"}.`,
    `Relationship: affinity=${relationship.affinity}; annoyance=${relationship.annoyance}; trust=${relationship.trust ?? 50}; familiarity=${relationship.familiarity ?? 50}; mood=${relationship.mood ?? "neutral"}; blocked=${relationship.blocked ? "yes" : "no"}.`,
    `Plan: intent=${plan.intent}; tone=${plan.tone}; mode=${plan.mode}; length=${plan.length}; userEmotion=${plan.userEmotion}; pressure=${plan.pressure}.`,
    `Length rule: ${lengthInstruction(plan.length)}`,
    `Mode rule: ${modeInstruction(plan.mode)}`,
    `Opener rule: ${openerInstruction(plan.openerStyle)}`,
    "Rules: no markdown, no stage directions, no assistant phrasing, no visible-action narration unless brief visual context is explicitly useful.",
    "Write like a real person texting: direct, specific, and not over-explained.",
    worldContext ? `Context:\n${worldContext}` : "",
    memorySummary ? `Memory:\n${memorySummary}` : "",
    recentHistory ? `Recent history:\n${recentHistory}` : "",
    `User message:\n${message}`,
    "Output only the reply.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
