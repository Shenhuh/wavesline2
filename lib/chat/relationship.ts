// lib/chat/relationship.ts

export type CharacterMood =
  | "neutral"
  | "curious"
  | "warm"
  | "guarded"
  | "annoyed"
  | "concerned"
  | "playful";

export type MemoryEmotion =
  | "neutral"
  | "negative"
  | "positive"
  | "aggressive"
  | "flirty";

export type CharacterMemory = {
  recentTopics: string[];
  emotionalStreak: MemoryEmotion;
  emotionalStreakCount: number;
  lastUserIntent?: string;
  lastUserEmotion?: MemoryEmotion;
  unresolvedTopic?: string;
  userPatternNotes: string[];
};

export type CharacterRuntimeState = {
  affinity: number;
  annoyance: number;
  mood: CharacterMood;
  blocked: boolean;
  memory: CharacterMemory;
};

const STORAGE_PREFIX = "wavesline:relationship";

export const DEFAULT_MEMORY: CharacterMemory = {
  recentTopics: [],
  emotionalStreak: "neutral",
  emotionalStreakCount: 0,
  lastUserIntent: undefined,
  lastUserEmotion: "neutral",
  unresolvedTopic: undefined,
  userPatternNotes: [],
};

export const DEFAULT_RUNTIME_STATE: CharacterRuntimeState = {
  affinity: 0,
  annoyance: 0,
  mood: "neutral",
  blocked: false,
  memory: DEFAULT_MEMORY,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getStorageKey(sessionId: string, characterId: string) {
  return `${STORAGE_PREFIX}:${sessionId}:${characterId}`;
}

function normalize(text: string) {
  return text.toLowerCase().trim();
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function detectTopics(textRaw: string): string[] {
  const text = normalize(textRaw);
  const topics = new Set<string>();

  if (
    includesAny(text, [
      "rinascita",
      "huanglong",
      "black shores",
      "sentinel",
      "threnodian",
      "lore",
      "region",
      "faction",
      "monster",
      "echo",
      "resonator",
      "story",
      "lament",
    ])
  ) {
    topics.add("lore");
  }

  if (
    includesAny(text, [
      "sad",
      "awful",
      "terrible",
      "miserable",
      "drained",
      "hurt",
      "lonely",
      "anxious",
      "depressed",
      "overwhelmed",
      "not okay",
      "bad day",
      "feel awful",
      "feel horrible",
    ])
  ) {
    topics.add("emotion");
  }

  if (
    includesAny(text, [
      "love",
      "miss you",
      "date me",
      "kiss",
      "hug me",
      "be mine",
      "want you",
    ])
  ) {
    topics.add("romance");
  }

  if (
    includesAny(text, [
      "fight",
      "battle",
      "enemy",
      "combat",
      "stronger than",
      "defeat",
      "vs",
      "versus",
    ])
  ) {
    topics.add("combat");
  }

  if (
    includesAny(text, [
      "who are you",
      "what are you",
      "are you ai",
      "what model",
    ])
  ) {
    topics.add("meta");
  }

  if (
    includesAny(text, [
      "project",
      "chat app",
      "group chat",
      "memory",
      "planner",
      "route",
      "code",
      "full code",
    ])
  ) {
    topics.add("meta_workflow");
  }

  if (!topics.size) {
    topics.add("general");
  }

  return Array.from(topics);
}

function detectUserEmotion(textRaw: string): MemoryEmotion {
  const text = normalize(textRaw);

  if (
    includesAny(text, [
      "stupid",
      "dumb",
      "idiot",
      "shut up",
      "fuck you",
      "useless",
      "annoying",
      "trash",
      "moron",
      "wtf",
    ])
  ) {
    return "aggressive";
  }

  if (
    includesAny(text, [
      "love",
      "miss you",
      "date me",
      "kiss",
      "hug me",
      "want you",
      "cute",
      "beautiful",
    ])
  ) {
    return "flirty";
  }

  if (
    includesAny(text, [
      "sad",
      "awful",
      "terrible",
      "miserable",
      "drained",
      "hurt",
      "lonely",
      "anxious",
      "depressed",
      "overwhelmed",
      "not okay",
      "bad day",
      "feel awful",
      "feel horrible",
      "today sucked",
    ])
  ) {
    return "negative";
  }

  if (
    includesAny(text, [
      "thanks",
      "thank you",
      "nice",
      "great",
      "good",
      "happy",
      "love this",
      "amazing",
    ])
  ) {
    return "positive";
  }

  return "neutral";
}

function detectIntentLabel(textRaw: string): string {
  const text = normalize(textRaw);

  if (text.includes("?")) return "question";
  if (
    includesAny(text, [
      "tell me",
      "explain",
      "show me",
      "write",
      "make",
      "send me",
      "help me",
    ])
  ) {
    return "request";
  }
  if (
    includesAny(text, [
      "sad",
      "awful",
      "hurt",
      "lonely",
      "depressed",
      "overwhelmed",
    ])
  ) {
    return "emotional";
  }
  if (
    includesAny(text, [
      "love",
      "miss you",
      "date me",
      "kiss",
    ])
  ) {
    return "romantic";
  }

  return "statement";
}

function dedupeKeepRecent(items: string[], max: number) {
  const out: string[] = [];

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (!out.includes(item)) {
      out.unshift(item);
    }
  }

  return out.slice(-max);
}

function buildPatternNotes(args: {
  current: CharacterMemory;
  nextEmotion: MemoryEmotion;
  topics: string[];
  text: string;
}) {
  const { current, nextEmotion, topics, text } = args;
  const notes = [...current.userPatternNotes];
  const add = (note: string) => {
    if (!notes.includes(note)) notes.push(note);
  };

  if (nextEmotion === "aggressive" && current.emotionalStreakCount >= 1) {
    add("user has been hostile repeatedly");
  }

  if (nextEmotion === "negative" && current.emotionalStreakCount >= 1) {
    add("user has been emotionally distressed across multiple turns");
  }

  if (nextEmotion === "flirty") {
    add("user tends toward flirtation");
  }

  if (topics.includes("lore")) {
    add("user is strongly interested in lore");
  }

  if (topics.includes("meta_workflow")) {
    add("user is actively building the chat system");
  }

  if (includesAny(text, ["full code", "send me full", "exact code"])) {
    add("user prefers direct implementation help");
  }

  return dedupeKeepRecent(notes, 8);
}

function updateMemory(previous: CharacterMemory, userMessage: string): CharacterMemory {
  const topics = detectTopics(userMessage);
  const nextEmotion = detectUserEmotion(userMessage);
  const nextIntent = detectIntentLabel(userMessage);

  const sameEmotion = previous.lastUserEmotion === nextEmotion;
  const emotionalStreakCount =
    nextEmotion === "neutral"
      ? 0
      : sameEmotion
      ? previous.emotionalStreakCount + 1
      : 1;

  let unresolvedTopic = previous.unresolvedTopic;

  if (topics.includes("lore")) unresolvedTopic = "lore";
  else if (topics.includes("emotion")) unresolvedTopic = "emotion";
  else if (topics.includes("romance")) unresolvedTopic = "romance";
  else if (topics.includes("combat")) unresolvedTopic = "combat";
  else if (nextIntent === "question" || nextIntent === "request") {
    unresolvedTopic = previous.unresolvedTopic ?? topics[0];
  }

  const recentTopics = dedupeKeepRecent(
    [...previous.recentTopics, ...topics],
    6
  );

  const userPatternNotes = buildPatternNotes({
    current: previous,
    nextEmotion,
    topics,
    text: normalize(userMessage),
  });

  return {
    recentTopics,
    emotionalStreak: nextEmotion,
    emotionalStreakCount,
    lastUserIntent: nextIntent,
    lastUserEmotion: nextEmotion,
    unresolvedTopic,
    userPatternNotes,
  };
}

function chooseMood(args: {
  previousMood: CharacterMood;
  affinity: number;
  annoyance: number;
  blocked: boolean;
  emotion: MemoryEmotion;
  topics: string[];
}): CharacterMood {
  const { affinity, annoyance, blocked, emotion, topics } = args;

  if (blocked) return "annoyed";
  if (annoyance >= 70) return "annoyed";
  if (emotion === "aggressive") return "annoyed";
  if (emotion === "negative") return "concerned";
  if (emotion === "flirty" && affinity >= 45) return "warm";
  if (topics.includes("lore")) return "curious";
  if (affinity >= 55) return "warm";

  return "neutral";
}

export function deriveNextCharacterState(
  previous: CharacterRuntimeState,
  userMessage: string
): CharacterRuntimeState {
  const nextMemory = updateMemory(previous.memory ?? DEFAULT_MEMORY, userMessage);
  const emotion = nextMemory.lastUserEmotion ?? "neutral";

  let affinity = previous.affinity;
  let annoyance = previous.annoyance;
  let blocked = previous.blocked;

  if (emotion === "positive") affinity += 2;
  if (emotion === "flirty") affinity += 1;
  if (emotion === "negative") affinity += 0;
  if (emotion === "aggressive") {
    affinity -= 4;
    annoyance += 14;
  }

  if (nextMemory.emotionalStreak === "negative" && nextMemory.emotionalStreakCount >= 3) {
    annoyance = Math.max(0, annoyance - 2);
  }

  if (
    nextMemory.emotionalStreak === "aggressive" &&
    nextMemory.emotionalStreakCount >= 3
  ) {
    annoyance += 10;
  }

  affinity = clamp(affinity, -100, 100);
  annoyance = clamp(annoyance, 0, 100);

  if (annoyance >= 92) blocked = true;

  const mood = chooseMood({
    previousMood: previous.mood,
    affinity,
    annoyance,
    blocked,
    emotion,
    topics: nextMemory.recentTopics,
  });

  return {
    affinity,
    annoyance,
    mood,
    blocked,
    memory: nextMemory,
  };
}

export function saveCharacterState(
  sessionId: string,
  characterId: string,
  state: CharacterRuntimeState
) {
  if (typeof window === "undefined") return;

  localStorage.setItem(getStorageKey(sessionId, characterId), JSON.stringify(state));
}

export function loadCharacterState(
  sessionId: string,
  characterId: string
): CharacterRuntimeState {
  if (typeof window === "undefined") return DEFAULT_RUNTIME_STATE;

  const parsed = safeJsonParse<CharacterRuntimeState>(
    localStorage.getItem(getStorageKey(sessionId, characterId)),
    DEFAULT_RUNTIME_STATE
  );

  return {
    affinity: parsed.affinity ?? DEFAULT_RUNTIME_STATE.affinity,
    annoyance: parsed.annoyance ?? DEFAULT_RUNTIME_STATE.annoyance,
    mood: parsed.mood ?? DEFAULT_RUNTIME_STATE.mood,
    blocked: parsed.blocked ?? DEFAULT_RUNTIME_STATE.blocked,
    memory: {
      ...DEFAULT_MEMORY,
      ...(parsed.memory ?? {}),
      recentTopics: parsed.memory?.recentTopics ?? [],
      userPatternNotes: parsed.memory?.userPatternNotes ?? [],
    },
  };
}

export function clearCharacterState(sessionId: string, characterId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getStorageKey(sessionId, characterId));
}