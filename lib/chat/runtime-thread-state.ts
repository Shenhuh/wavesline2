// lib/chat/runtime-thread-state.ts

type BaseRelationshipLike = {
  affinity: number;
  trust: number;
  familiarity: number;
  notes: string | null;
  relationship_label: string | null;
};

export type RuntimeThreadState = {
  affinity: number;
  annoyance: number;
  trust: number;
  familiarity: number;
  mood: string;
  blocked: boolean;
  messageCount: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function hasAny(text: string, words: string[]) {
  return words.some((w) => text.includes(w));
}

export function seedRuntimeStateFromRelationship(
  relationship: BaseRelationshipLike | null
): RuntimeThreadState {
  return {
    affinity: relationship?.affinity ?? 10,
    annoyance: 0,
    trust: relationship?.trust ?? 20,
    familiarity: relationship?.familiarity ?? 10,
    mood: "neutral",
    blocked: false,
    messageCount: 0,
  };
}

export function deriveNextThreadRuntimeState(
  current: RuntimeThreadState,
  userMessage: string
): RuntimeThreadState {
  const text = normalize(userMessage);

  let affinity = current.affinity;
  let annoyance = current.annoyance;
  let trust = current.trust;
  let familiarity = current.familiarity;
  let mood = current.mood;
  const blocked = current.blocked;
  const messageCount = current.messageCount + 1;

  familiarity = clamp(familiarity + 1, 0, 100);

  if (
    hasAny(text, [
      "thank you",
      "thanks",
      "sorry",
      "understood",
      "fair enough",
      "i see",
      "good point",
    ])
  ) {
    trust += 1;
    affinity += 1;
    annoyance -= 2;
  }

  if (
    hasAny(text, [
      "stupid",
      "idiot",
      "annoying",
      "useless",
      "shut up",
      "moron",
      "dumb",
      "pathetic",
      "trash",
      "you talk too much",
      "i didn't ask",
      "keep your advice",
      "fuck you",
    ])
  ) {
    annoyance += 14;
    trust -= 6;
    affinity -= 5;
  }

  if (
    hasAny(text, [
      "i don't trust you",
      "youre lying",
      "you're lying",
      "you are lying",
      "prove it",
      "why should i trust you",
    ])
  ) {
    annoyance += 6;
    trust -= 8;
  }

  if (
    hasAny(text, [
      "help me",
      "can you explain",
      "what do you know",
      "tell me more",
      "what happened",
      "do you know",
    ])
  ) {
    trust += 1;
  }

  if (
    hasAny(text, [
      "i feel sad",
      "i'm scared",
      "im scared",
      "i'm tired",
      "im tired",
      "i'm hurt",
      "im hurt",
    ])
  ) {
    trust += 2;
  }

  if (annoyance >= 70) mood = "angry";
  else if (annoyance >= 40) mood = "irritated";
  else if (trust <= 15) mood = "cold";
  else if (affinity >= 60) mood = "warm";
  else mood = "neutral";

  return {
    affinity: clamp(affinity, 0, 100),
    annoyance: clamp(annoyance, 0, 100),
    trust: clamp(trust, 0, 100),
    familiarity: clamp(familiarity, 0, 100),
    mood,
    blocked,
    messageCount,
  };
}

export function applyAssistantReplyEffects(
  current: RuntimeThreadState,
  assistantReply: string
): RuntimeThreadState {
  const text = normalize(assistantReply);

  let affinity = current.affinity;
  let annoyance = current.annoyance;
  let trust = current.trust;
  let familiarity = current.familiarity;
  let mood = current.mood;
  const blocked = current.blocked;
  const messageCount = current.messageCount;

  if (
    hasAny(text, [
      "understood",
      "good",
      "fair",
      "you were right",
      "i misspoke",
      "you've earned",
    ])
  ) {
    trust += 1;
  }

  if (
    hasAny(text, [
      "enough",
      "leave",
      "i'm done",
      "this conversation is over",
      "don't message me again",
    ])
  ) {
    annoyance += 3;
  }

  if (annoyance >= 70) mood = "angry";
  else if (annoyance >= 40) mood = "irritated";
  else if (trust <= 15) mood = "cold";
  else if (affinity >= 60) mood = "warm";
  else mood = "neutral";

  return {
    affinity: clamp(affinity, 0, 100),
    annoyance: clamp(annoyance, 0, 100),
    trust: clamp(trust, 0, 100),
    familiarity: clamp(familiarity, 0, 100),
    mood,
    blocked,
    messageCount,
  };
}

export function applyBlockingRule(args: {
  state: RuntimeThreadState;
  annoyanceThreshold: number;
}): RuntimeThreadState {
  const { state, annoyanceThreshold } = args;

  if (state.blocked) return state;

  if (state.annoyance >= annoyanceThreshold) {
    return {
      ...state,
      blocked: true,
      mood: "angry",
    };
  }

  return state;
}