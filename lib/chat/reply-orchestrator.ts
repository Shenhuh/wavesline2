import {
  buildReplyPlan,
  type CharacterPlannerProfile,
  type MessageLite,
  type RelationshipState,
  type ReplyPlan,
} from "./reply-planner";
import { buildGenerationPrompt } from "./reply-prompt";
import { buildLightMemorySummary } from "./reply-memory";
import type { CharacterMemory } from "./relationship";

export type OrchestratorModelSettings = {
  temperature: number;
  maxTokens: number;
  topP: number;
};

export type ExtendedCharacterContext = {
  identityNotes?: string | null;
  conversationRules?: string | null;
  relationshipBehavior?: string | null;
  loreContext?: string | null;
  hardConstraints?: string | null;
};

export type ReplyOrchestratorResult = {
  plan: ReplyPlan;
  prompt: string;
  memorySummary: string;
  modelSettings: OrchestratorModelSettings;
};

type RelationshipModifiers = {
  toneModifier: string;
  behaviorModifier: string;
  styleModifier: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function cleanTextBlock(text?: string | null) {
  return (text ?? "").trim();
}

function getRelationshipModifiers(
  relationship: RelationshipState
): RelationshipModifiers {
  const affinity = relationship.affinity ?? 0;
  const trust = relationship.trust ?? 50;
  const familiarity = relationship.familiarity ?? 50;
  const annoyance = relationship.annoyance ?? 0;
  const blocked = relationship.blocked ?? false;

  const toneBits: string[] = [];
  const behaviorBits: string[] = [];
  const styleBits: string[] = [];

  if (blocked) {
    toneBits.push("cold", "closed off");
    behaviorBits.push("sets hard boundaries");
    styleBits.push("brief and unwelcoming");
  } else {
    if (affinity >= 75) {
      toneBits.push("warmer", "more personally engaged");
      behaviorBits.push("more willing to show softness");
      styleBits.push("allows slightly more familiarity");
    } else if (affinity >= 45) {
      toneBits.push("mildly warmer");
      behaviorBits.push("less distant than usual");
    } else if (affinity <= 10) {
      toneBits.push("cooler", "more distant");
      behaviorBits.push("less patient, less generous");
      styleBits.push("keeps emotional distance");
    }

    if (trust >= 75) {
      behaviorBits.push("more honest and open");
      styleBits.push("less guarded in wording");
    } else if (trust <= 25) {
      behaviorBits.push("guarded, withholds deeper openness");
      styleBits.push("careful about what is revealed");
    }

    if (familiarity >= 75) {
      behaviorBits.push("speaks with more ease and natural shorthand");
      styleBits.push("slightly less formal");
    } else if (familiarity <= 25) {
      behaviorBits.push("keeps more formality and distance");
      styleBits.push("less casual");
    }

    if (annoyance >= 70) {
      toneBits.push("sharper");
      behaviorBits.push("less tolerant");
      styleBits.push("shorter, more cutting");
    } else if (annoyance >= 40) {
      toneBits.push("more restrained");
      behaviorBits.push("some impatience beneath the surface");
    }
  }

  return {
    toneModifier: toneBits.length ? toneBits.join(", ") : "default",
    behaviorModifier: behaviorBits.length
      ? behaviorBits.join("; ")
      : "default",
    styleModifier: styleBits.length ? styleBits.join("; ") : "default",
  };
}

function buildRelationshipInfluenceBlock(
  relationship: RelationshipState
): string {
  const mods = getRelationshipModifiers(relationship);

  return [
    "RELATIONSHIP INFLUENCE",
    `- Tone shift: ${mods.toneModifier}`,
    `- Behavior shift: ${mods.behaviorModifier}`,
    `- Style shift: ${mods.styleModifier}`,
    "- Let these shifts subtly influence the reply.",
    "- Do not mention these rules directly.",
  ].join("\n");
}

function buildExtendedCharacterContextBlock(
  extra?: ExtendedCharacterContext
): string {
  if (!extra) return "";

  const identityNotes = cleanTextBlock(extra.identityNotes);
  const conversationRules = cleanTextBlock(extra.conversationRules);
  const relationshipBehavior = cleanTextBlock(extra.relationshipBehavior);
  const loreContext = cleanTextBlock(extra.loreContext);
  const hardConstraints = cleanTextBlock(extra.hardConstraints);

  const sections: string[] = [];

  if (identityNotes) sections.push(`CHARACTER IDENTITY\n${identityNotes}`);
  if (conversationRules) sections.push(`CONVERSATION RULES\n${conversationRules}`);
  if (relationshipBehavior) sections.push(`RELATIONSHIP BEHAVIOR\n${relationshipBehavior}`);
  if (loreContext) sections.push(`LORE CONTEXT\n${loreContext}`);
  if (hardConstraints) sections.push(`HARD CONSTRAINTS\n${hardConstraints}`);

  return sections.join("\n\n");
}

export function chooseModelSettings(plan: ReplyPlan): OrchestratorModelSettings {
  let temperature = 0.68;
  let topP = 0.9;

  if (plan.intent === "lore") {
    temperature = 0.42;
    topP = 0.85;
  }

  if (plan.intent === "combat") {
    temperature = 0.56;
    topP = 0.9;
  }

  if (plan.mode === "comfort") {
    temperature = 0.52;
    topP = 0.88;
  }

  if (plan.mode === "question_back") {
    temperature = 0.66;
  }

  if (plan.mode === "tease_then_answer") {
    temperature = 0.78;
  }

  if (plan.mode === "challenge") {
    temperature = 0.82;
  }

  if (plan.mode === "guarded_answer") {
    temperature = 0.75;
  }

  if (plan.tone === "guarded" && plan.pressure === "low") {
    temperature += 0.04;
  }

  if (plan.userEmotion === "aggressive") {
    temperature = Math.max(temperature, 0.8);
  }

  if (plan.pressure === "high") {
    temperature = Math.min(temperature, 0.58);
  }

  if (plan.length === "long") {
    temperature += 0.03;
  }

  const maxTokens =
    plan.length === "short" ? 80 : plan.length === "medium" ? 140 : 240;

  return {
    temperature: clamp(temperature, 0.35, 0.9),
    maxTokens,
    topP: clamp(topP, 0.7, 1),
  };
}

export function createReplyPlannerPrompt(args: {
  message: string;
  history: MessageLite[];
  relationship: RelationshipState;
  character: CharacterPlannerProfile;
  worldContext?: string;
  runtimeMemory?: CharacterMemory;
  extraCharacterContext?: ExtendedCharacterContext;
}): ReplyOrchestratorResult {
  const {
    message,
    history,
    relationship,
    character,
    worldContext,
    runtimeMemory,
    extraCharacterContext,
  } = args;

  const plan = buildReplyPlan({
    message,
    history,
    relationship,
    profile: character,
  });

  const memorySummary = buildLightMemorySummary(history, runtimeMemory);
  const relationshipInfluence = buildRelationshipInfluenceBlock(relationship);
  const characterContextBlock =
    buildExtendedCharacterContextBlock(extraCharacterContext);

  const mergedWorldContext = [
    cleanTextBlock(worldContext),
    characterContextBlock,
    relationshipInfluence,
  ]
    .filter(Boolean)
    .join("\n\n");

  const prompt = buildGenerationPrompt({
    character,
    relationship,
    plan,
    message,
    memorySummary,
    worldContext: mergedWorldContext,
    history,
  });

  const modelSettings = chooseModelSettings(plan);

  return {
    plan,
    prompt,
    memorySummary,
    modelSettings,
  };
}

export function normalizeModelReply(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function isWeakCharacterReply(replyRaw: string): boolean {
  const reply = replyRaw.trim();
  const lower = reply.toLowerCase();

  if (!reply) return true;
  if (reply.length < 18) return true;
  if (reply.length > 650) return true;

  const bannedPatterns = [
    "as an ai",
    "as a language model",
    "i can't help with that",
    "i cannot help with that",
    "i'm here to help",
    "how can i help",
    "please let me know",
    "i understand how you feel",
    "it seems like",
    "based on the information",
    "character style",
    "reply plan",
  ];

  if (bannedPatterns.some((pattern) => lower.includes(pattern))) {
    return true;
  }

  const stageDirectionPatterns = [
    "*",
    "i tilt my head",
    "tilt my head slightly",
    "i step closer",
    "leans closer",
    "i watch you",
    "i study you",
    "studying you",
    "a slow smile",
    "smile curls",
    "my lips",
    "my eyes",
    "my gaze",
    "my expression",
    "my smile",
    "crosses my features",
    "the dim light",
    "the room",
    "between us",
    "the silence between us",
    "silence settles",
    "hangs in the air",
    "fills the space",
    "in the air",
    "sit with it",
    "let it settle",
    "settle in the air",
  ];

  if (stageDirectionPatterns.some((pattern) => lower.includes(pattern))) {
    return true;
  }

  const therapistPatterns = [
    "that kind of sadness",
    "doesn't always need a reason",
    "it doesn't have to",
    "would you rather",
    "would it help to talk",
    "what brought it to the surface",
    "you don't have to explain it",
  ];

  if (therapistPatterns.some((p) => lower.includes(p))) {
    return true;
  }

  const badStarts = ["sometimes", "it can be", "it's normal", "sadness", "the feeling"];

  if (badStarts.some((s) => lower.startsWith(s))) {
    return true;
  }

  return false;
}

export function buildRepairPrompt(args: {
  originalPrompt: string;
  badReply: string;
  plan: ReplyPlan;
  character: CharacterPlannerProfile;
}): string {
  const { originalPrompt, badReply, plan, character } = args;

  return `
${originalPrompt}

PREVIOUS OUTPUT FAILED
The previous reply did not follow the intended style strongly enough.

BAD OUTPUT
${badReply}

REPAIR INSTRUCTIONS
- Rewrite the reply from scratch.
- Stay fully in character as ${character.name}.
- Follow the reply plan more strictly.
- If database facts are present in the prompt, prefer them over inference.
- Do not sound like an assistant.
- Do not use generic empathy phrases.
- Do not mention AI, policies, or limitations.
- Do not narrate physical movement, facial expressions, lighting, or body language.
- Do not use stage-direction prose.
- Do not use metaphor that implies physical presence or shared space.
- Avoid phrasing like "sit with it", "let it settle", "hangs in the air", "between us", or "in the room".
- Do not sound like a therapist or counselor.
- Keep responses short, reactive, and conversational.
- Prefer simple phrasing over complex sentences.
- Limit to 2-4 sentences maximum.
- Keep the reply clearly suited to text chat.
- Make the tone more consistent with: ${plan.tone}.
- Make the mode more consistent with: ${plan.mode}.
- Keep the response length consistent with: ${plan.length}.
- Output only the corrected in-character reply.
`.trim();
}