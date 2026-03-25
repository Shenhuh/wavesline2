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

function trimBlock(text: string, maxChars: number) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= maxChars) return cleaned;
  return `${cleaned.slice(0, maxChars - 1).trim()}…`;
}

const VISUALIZATION_TRIGGERS = [
  "visualize",
  "visualise",
  "diagram",
  "draw me",
  "draw a",
  "chart",
  "graph",
  "show me a",
  "plot",
  "sketch",
];

export function isVisualizationRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return VISUALIZATION_TRIGGERS.some((t) => lower.includes(t));
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
      behaviorBits.push("speaks with more ease and shorthand");
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
    behaviorModifier: behaviorBits.length ? behaviorBits.join("; ") : "default",
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
  ].join("\n");
}

function buildExtendedCharacterContextBlock(
  extra?: ExtendedCharacterContext
): string {
  if (!extra) return "";

  const sections: string[] = [];

  const identityNotes = trimBlock(cleanTextBlock(extra.identityNotes), 320);
  const conversationRules = trimBlock(cleanTextBlock(extra.conversationRules), 260);
  const relationshipBehavior = trimBlock(cleanTextBlock(extra.relationshipBehavior), 220);
  const loreContext = trimBlock(cleanTextBlock(extra.loreContext), 320);
  const hardConstraints = trimBlock(cleanTextBlock(extra.hardConstraints), 220);

  if (identityNotes) sections.push(`IDENTITY\n${identityNotes}`);
  if (conversationRules) sections.push(`RULES\n${conversationRules}`);
  if (relationshipBehavior) sections.push(`RELATIONSHIP\n${relationshipBehavior}`);
  if (loreContext) sections.push(`LORE\n${loreContext}`);
  if (hardConstraints) sections.push(`CONSTRAINTS\n${hardConstraints}`);

  return sections.join("\n\n");
}

export function chooseModelSettings(
  plan: ReplyPlan,
  isViz: boolean = false
): OrchestratorModelSettings {
  if (isViz) {
    return {
      temperature: 0.4,
      maxTokens: 1400,
      topP: 0.9,
    };
  }

  let temperature = 0.66;
  let topP = 0.9;

  if (plan.intent === "lore") {
    temperature = 0.42;
    topP = 0.85;
  }

  if (plan.intent === "combat") {
    temperature = 0.56;
  }

  if (plan.mode === "comfort") {
    temperature = 0.5;
    topP = 0.88;
  }

  if (plan.mode === "tease_then_answer") temperature = 0.76;
  if (plan.mode === "challenge") temperature = 0.8;
  if (plan.mode === "guarded_answer") temperature = 0.72;
  if (plan.mode === "question_back") temperature = 0.64;

  if (plan.userEmotion === "aggressive") {
    temperature = Math.max(temperature, 0.76);
  }

  if (plan.pressure === "high") {
    temperature = Math.min(temperature, 0.56);
  }

  const maxTokens =
    plan.length === "short" ? 70 : plan.length === "medium" ? 120 : 190;

  return {
    temperature: clamp(temperature, 0.35, 0.88),
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

  const isViz = isVisualizationRequest(message);
  const memorySummary = trimBlock(buildLightMemorySummary(history, runtimeMemory), 320);
  const relationshipInfluence = trimBlock(
    buildRelationshipInfluenceBlock(relationship),
    260
  );
  const characterContextBlock = buildExtendedCharacterContextBlock(extraCharacterContext);

  const mergedWorldContext = [
    trimBlock(cleanTextBlock(worldContext), 900),
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

  const modelSettings = chooseModelSettings(plan, isViz);

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
  if (reply.includes("<visualization>") || reply.includes("<svg")) return false;
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

  if (bannedPatterns.some((pattern) => lower.includes(pattern))) return true;

  const stageDirectionPatterns = [
    "*",
    "i tilt my head",
    "i step closer",
    "leans closer",
    "a slow smile",
    "my gaze",
    "the room",
    "between us",
    "hangs in the air",
    "sit with it",
  ];

  if (stageDirectionPatterns.some((pattern) => lower.includes(pattern))) return true;

  const therapistPatterns = [
    "that kind of sadness",
    "doesn't always need a reason",
    "would it help to talk",
    "you don't have to explain it",
  ];

  if (therapistPatterns.some((p) => lower.includes(p))) return true;

  const badStarts = ["sometimes", "it can be", "it's normal", "sadness", "the feeling"];
  if (badStarts.some((s) => lower.startsWith(s))) return true;

  return false;
}

export function buildRepairPrompt(args: {
  badReply: string;
  plan: ReplyPlan;
  character: CharacterPlannerProfile;
  userMessage?: string;
  visualContext?: string;
}): string {
  const { badReply, plan, character, userMessage, visualContext } = args;

  const visual = trimBlock(cleanTextBlock(visualContext), 280);
  const user = trimBlock(cleanTextBlock(userMessage), 180);

  return `
You are ${character.name}. Rewrite the bad reply into a stronger in-character chat reply.

Bad reply:
${badReply}

User message:
${user || "(not provided)"}

${visual ? `Useful context:\n${visual}\n` : ""}Rules:
- Stay fully in character.
- Sound like a real chat message, not an assistant.
- Keep it ${plan.length === "short" ? "very brief" : "brief"}.
- Match tone=${plan.tone}, mode=${plan.mode}.
- No markdown, no stage directions, no AI disclaimers.
- Do not mention franchise names unless asked.
- Use clear visual/action context naturally when relevant.
- Output only the corrected reply.
`.trim();
}
