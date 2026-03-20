// lib/chat/reply-planner.ts

export type ChatRole = "user" | "assistant" | "system";

export type PlannerIntent =
  | "question"
  | "greeting"
  | "farewell"
  | "request"
  | "opinion"
  | "emotional"
  | "romantic"
  | "roleplay"
  | "lore"
  | "combat"
  | "joke"
  | "meta"
  | "unknown";

export type PlannerTone =
  | "warm"
  | "neutral"
  | "cold"
  | "playful"
  | "concerned"
  | "annoyed"
  | "curious"
  | "guarded";

export type ReplyMode =
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
  | "observe_then_answer";

export type ReplyLength = "short" | "medium" | "long";

export type MessageLite = {
  role: ChatRole;
  content: string;
};

export type RelationshipState = {
  affinity: number;
  annoyance: number;
  trust?: number;
  familiarity?: number;
  mood?: string;
  blocked?: boolean;
};

export type CharacterPlannerProfile = {
  key: string;
  name: string;
  baseTone?: PlannerTone;
  defaultReplyLength?: ReplyLength;
  styleNotes?: string[];
  likes?: string[];
  dislikes?: string[];
  allowedModes?: ReplyMode[];
};

export type ReplyPlan = {
  intent: PlannerIntent;
  tone: PlannerTone;
  mode: ReplyMode;
  length: ReplyLength;
  userEmotion: "positive" | "neutral" | "negative" | "flirty" | "aggressive";
  pressure: "low" | "medium" | "high";
  shouldAskFollowUp: boolean;
  shouldReferenceMemory: boolean;
  shouldBeFactual: boolean;
  shouldBeCareful: boolean;
  openerStyle: "none" | "reaction" | "observation" | "softener";
  reasons: string[];
};

const GREETING_WORDS = [
  "hello",
  "hi",
  "hey",
  "good morning",
  "good evening",
  "good afternoon",
  "yo",
  "sup",
];

const FAREWELL_WORDS = [
  "bye",
  "goodbye",
  "see you",
  "good night",
  "farewell",
  "later",
];

const META_WORDS = [
  "who are you",
  "what are you",
  "are you ai",
  "what model",
  "what llm",
  "are you real",
];

const ROMANTIC_WORDS = [
  "love",
  "kiss",
  "marry",
  "date me",
  "be mine",
  "i like you",
  "i miss you",
  "hug me",
  "beautiful",
  "cute",
  "i want you",
];

const EMOTIONAL_WORDS = [
  "sad",
  "depressed",
  "upset",
  "hurt",
  "crying",
  "lonely",
  "anxious",
  "tired",
  "i feel bad",
  "i feel awful",
  "i feel sad",
  "i feel empty",
  "i'm scared",
  "im scared",
  "i'm hurting",
  "im hurting",
];

const LORE_WORDS = [
  "lore",
  "region",
  "faction",
  "sentinel",
  "threnodian",
  "echo",
  "monster",
  "resonator",
  "story",
  "what happened",
  "history",
  "fractsidus",
];

const COMBAT_WORDS = [
  "fight",
  "kill",
  "enemy",
  "combat",
  "battle",
  "win against",
  "defeat",
  "stronger than",
  "vengeance",
  "revenge",
  "destroy",
  "crush",
  "dominate",
  "conquer",
  "i will win",
  "i'll win",
  "im going to win",
  "i'm going to win",
  "driven by",
  "power",
  "destiny",
  "fate",
  "i will prove it",
  "i'll prove it",
];

const JOKE_WORDS = ["joke", "funny", "meme"];

const OPINION_WORDS = ["i think", "what do you think", "opinion"];

const REQUEST_WORDS = [
  "tell me",
  "explain",
  "give me",
  "show me",
  "help me",
  "write",
  "make",
  "do this",
  "can you",
  "could you",
];

const AGGRESSIVE_WORDS = [
  "stupid",
  "dumb",
  "shut up",
  "idiot",
  "useless",
  "annoying",
  "trash",
  "wtf",
  "fuck you",
  "moron",
  "pathetic",
];

const POSITIVE_WORDS = [
  "thanks",
  "thank you",
  "nice",
  "great",
  "good",
  "love this",
  "happy",
  "appreciate it",
];

const ASSERTIVE_PATTERNS = [
  "i will",
  "i'll",
  "i can",
  "i'm going to",
  "im going to",
  "i must",
  "i won't lose",
  "i wont lose",
  "i will win",
  "i'll win",
  "driven by",
  "vengeance",
  "revenge",
  "destiny",
  "power",
];

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function normalizeSoft(text: string) {
  return normalize(text).replace(/\s+/g, " ");
}

function includesAny(text: string, words: string[]) {
  return words.some((w) => text.includes(w));
}

function countMatches(text: string, words: string[]) {
  return words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);
}

function isGreeting(text: string) {
  if (includesAny(text, GREETING_WORDS)) return true;
  return /^(hi|hey|hello|yo)\b/.test(text);
}

function isFarewell(text: string) {
  return includesAny(text, FAREWELL_WORDS);
}

function looksLikeRoleplay(textRaw: string) {
  const text = textRaw.trim();
  return (
    text.includes("*") ||
    text.startsWith("(") ||
    text.startsWith("[") ||
    includesAny(normalizeSoft(text), [
      "pretend",
      "roleplay",
      "act like",
      "stay in character",
    ])
  );
}

function isAssertiveOrCharged(text: string) {
  return includesAny(text, ASSERTIVE_PATTERNS);
}

function detectIntent(textRaw: string): PlannerIntent {
  const text = normalizeSoft(textRaw);
  if (!text) return "unknown";

  if (isGreeting(text)) return "greeting";
  if (isFarewell(text)) return "farewell";

  if (includesAny(text, META_WORDS)) return "meta";
  if (includesAny(text, ROMANTIC_WORDS)) return "romantic";
  if (includesAny(text, EMOTIONAL_WORDS)) return "emotional";
  if (includesAny(text, LORE_WORDS)) return "lore";
  if (includesAny(text, COMBAT_WORDS)) return "combat";
  if (looksLikeRoleplay(textRaw)) return "roleplay";
  if (includesAny(text, JOKE_WORDS)) return "joke";
  if (includesAny(text, OPINION_WORDS)) return "opinion";
  if (includesAny(text, REQUEST_WORDS)) return "request";

  if (includesAny(text, AGGRESSIVE_WORDS)) {
    return text.includes("?") ? "question" : "unknown";
  }

  if (text.includes("?")) return "question";

  if (isAssertiveOrCharged(text)) return "combat";

  return "unknown";
}

function detectUserEmotion(textRaw: string): ReplyPlan["userEmotion"] {
  const text = normalizeSoft(textRaw);

  if (includesAny(text, ROMANTIC_WORDS)) return "flirty";
  if (includesAny(text, AGGRESSIVE_WORDS)) return "aggressive";
  if (includesAny(text, EMOTIONAL_WORDS)) return "negative";
  if (includesAny(text, POSITIVE_WORDS)) return "positive";

  return "neutral";
}

function detectPressure(textRaw: string): ReplyPlan["pressure"] {
  const text = normalizeSoft(textRaw);

  let score = 0;

  if (text.length > 180) score += 1;
  if (
    countMatches(text, ["now", "hurry", "quick", "exact", "full code", "just send"]) >=
    2
  ) {
    score += 2;
  }
  if (countMatches(text, ["!!!", "??", "why", "still", "again"]) >= 2) {
    score += 1;
  }
  if (includesAny(text, ["do it now", "just do it", "full code now"])) {
    score += 2;
  }

  if (score >= 3) return "high";
  if (score >= 1) return "medium";
  return "low";
}

function chooseTone(args: {
  profile: CharacterPlannerProfile;
  relationship: RelationshipState;
  intent: PlannerIntent;
  userEmotion: ReplyPlan["userEmotion"];
  message: string;
}): PlannerTone {
  const { profile, relationship, intent, userEmotion, message } = args;
  const text = normalizeSoft(message);

  if (relationship.blocked) return "cold";
  if ((relationship.annoyance ?? 0) >= 75) return "annoyed";
  if (userEmotion === "negative") return "concerned";
  if (userEmotion === "aggressive") {
    return relationship.affinity >= 60 ? "guarded" : "cold";
  }
  if (intent === "romantic") {
    return relationship.affinity >= 65 ? "warm" : "guarded";
  }
  if (intent === "joke") return "playful";
  if (intent === "lore") return "curious";
  if (intent === "combat") {
    if ((relationship.trust ?? 50) <= 35 || relationship.affinity <= 20) {
      return "cold";
    }
    return "guarded";
  }
  if (isAssertiveOrCharged(text) && relationship.affinity <= 25) {
    return "guarded";
  }

  return profile.baseTone ?? "neutral";
}

function chooseMode(args: {
  intent: PlannerIntent;
  tone: PlannerTone;
  relationship: RelationshipState;
  pressure: ReplyPlan["pressure"];
  userEmotion: ReplyPlan["userEmotion"];
  profile: CharacterPlannerProfile;
  message: string;
}): ReplyMode {
  const { intent, tone, relationship, pressure, userEmotion, profile, message } =
    args;

  const text = normalizeSoft(message);
  const assertive = isAssertiveOrCharged(text);

  let mode: ReplyMode = "direct_answer";

  if (relationship.blocked) {
    mode = "meta_boundary";
  } else if (userEmotion === "negative") {
    mode = "comfort";
  } else if (userEmotion === "aggressive") {
    mode = relationship.affinity >= 50 ? "guarded_answer" : "deflect";
  } else if (intent === "combat") {
    mode = "challenge";
  } else if (intent === "lore") {
    mode = "lore_explain";
  } else if (intent === "romantic") {
    mode = relationship.affinity >= 65 ? "romantic_soft" : "guarded_answer";
  } else if (intent === "meta") {
    mode = "meta_boundary";
  } else if (intent === "joke") {
    mode = "tease_then_answer";
  } else if (assertive && (relationship.trust ?? 50) <= 45) {
    mode = "challenge";
  } else if (pressure === "high") {
    mode = "brief_answer";
  } else if (tone === "playful") {
    mode = "tease_then_answer";
  } else if (tone === "curious") {
    mode = "observe_then_answer";
  } else if (tone === "cold" && intent === "question") {
    mode = "guarded_answer";
  } else if (intent === "question") {
    mode = "direct_answer";
  } else if (intent === "greeting") {
    mode = relationship.affinity <= 20 ? "guarded_answer" : "question_back";
  } else if (intent === "opinion") {
    mode = "question_back";
  } else {
    mode = "question_back";
  }

  if (profile.allowedModes?.length && !profile.allowedModes.includes(mode)) {
    if (mode === "challenge" && profile.allowedModes.includes("guarded_answer")) {
      mode = "guarded_answer";
    } else if (
      mode === "deflect" &&
      profile.allowedModes.includes("guarded_answer")
    ) {
      mode = "guarded_answer";
    } else {
      mode = profile.allowedModes[0];
    }
  }

  return mode;
}

function chooseLength(args: {
  intent: PlannerIntent;
  pressure: ReplyPlan["pressure"];
  relationship: RelationshipState;
  mode: ReplyMode;
  profile: CharacterPlannerProfile;
  message: string;
}): ReplyLength {
  const { intent, pressure, relationship, mode, profile, message } = args;
  const text = normalizeSoft(message);

  if (pressure === "high") return "short";
  if (mode === "brief_answer") return "short";
  if (mode === "challenge" && text.length < 60) return "short";
  if (intent === "lore") return "long";
  if (intent === "emotional") return "medium";
  if ((relationship.annoyance ?? 0) >= 70) return "short";

  return profile.defaultReplyLength ?? "medium";
}

export function buildReplyPlan(args: {
  message: string;
  history: MessageLite[];
  relationship: RelationshipState;
  profile: CharacterPlannerProfile;
}): ReplyPlan {
  const { message, history, relationship, profile } = args;

  const intent = detectIntent(message);
  const userEmotion = detectUserEmotion(message);
  const pressure = detectPressure(message);
  const tone = chooseTone({
    profile,
    relationship,
    intent,
    userEmotion,
    message,
  });
  const mode = chooseMode({
    intent,
    tone,
    relationship,
    pressure,
    userEmotion,
    profile,
    message,
  });
  const length = chooseLength({
    intent,
    pressure,
    relationship,
    mode,
    profile,
    message,
  });

  const recentUserMsgs = history.filter((m) => m.role === "user").slice(-4);
  const repeatedTopic =
    recentUserMsgs.length >= 2 &&
    recentUserMsgs.some((m) => normalizeSoft(m.content).includes("monster")) &&
    normalizeSoft(message).includes("monster");

  const shouldReferenceMemory =
    relationship.affinity >= 45 || repeatedTopic || intent === "romantic";

  const shouldAskFollowUp =
    mode === "question_back" ||
    mode === "comfort" ||
    mode === "challenge" ||
    (intent === "opinion" && pressure !== "high");

  const shouldBeFactual =
    intent === "lore" ||
    intent === "question" ||
    intent === "combat" ||
    intent === "request";

  const shouldBeCareful =
    userEmotion === "negative" ||
    userEmotion === "aggressive" ||
    intent === "romantic" ||
    relationship.annoyance >= 65;

  const openerStyle: ReplyPlan["openerStyle"] =
    mode === "observe_then_answer"
      ? "observation"
      : mode === "comfort"
      ? "softener"
      : shouldBeFactual && pressure !== "high"
      ? "reaction"
      : "none";

  const reasons: string[] = [];
  reasons.push(`intent=${intent}`);
  reasons.push(`tone=${tone}`);
  reasons.push(`mode=${mode}`);
  reasons.push(`length=${length}`);
  if (repeatedTopic) reasons.push("repeated_topic");
  if (shouldReferenceMemory) reasons.push("use_memory");
  if (shouldBeCareful) reasons.push("careful_tone");
  if (isAssertiveOrCharged(normalizeSoft(message))) reasons.push("assertive_input");

  return {
    intent,
    tone,
    mode,
    length,
    userEmotion,
    pressure,
    shouldAskFollowUp,
    shouldReferenceMemory,
    shouldBeFactual,
    shouldBeCareful,
    openerStyle,
    reasons,
  };
}