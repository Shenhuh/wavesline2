// lib/chat/sticker-ai.ts

import { createAdminClient } from "@/lib/supabase/admin";

export type AiStickerChoice = {
  id: string;
  key: string;
  label: string;
  image_path: string;
};

type StickerDbRow = AiStickerChoice & {
  ai_enabled: boolean;
  ai_triggers: string[];
  sort_order: number;
};

function normalize(text: string) {
  return text.toLowerCase().trim();
}

const FALLBACK_RULES: Record<string, string[]> = {
  hello: ["hello", "hi", "yo", "hey"],
  love: ["love", "heart", "miss you"],
  cry: ["cry", "sad", "hurt", "pain"],
  approve: ["approve", "good", "nice", "great", "okay", "ok"],
  refused: ["no", "refuse", "wont", "won't", "cannot", "decline"],
  surprised: ["what", "huh", "really", "seriously", "surprised"],
  smug: ["smug", "obviously", "easy"],
  tease: ["tease", "idiot", "dummy", "cute"],
  proud: ["proud", "well done"],
  shrugs: ["shrug", "whatever", "idk"],
  sip: ["sip", "tea"],
  stonks: ["stonks", "profit", "win"],
  happy: ["happy", "glad", "yay"],
};

const MOOD_FACTORS: Record<string, number> = {
  playful: 1.35,
  curious: 1.1,
  warm: 1.15,
  neutral: 1.0,
  guarded: 0.8,
  cold: 0.7,
  concerned: 0.8,
  annoyed: 1.05,
  calm: 0.9,
};

const STICKER_MOOD_BONUS: Record<string, Partial<Record<string, number>>> = {
  tease: { playful: 0.16, annoyed: 0.08, cold: 0.03 },
  smug: { playful: 0.1, cold: 0.09, guarded: 0.05 },
  happy: { warm: 0.12, playful: 0.16, neutral: 0.04 },
  cry: { concerned: 0.12, annoyed: 0.03 },
  approve: { warm: 0.08, neutral: 0.05, calm: 0.06 },
  refused: { cold: 0.14, guarded: 0.1, annoyed: 0.13 },
  surprised: { curious: 0.1, playful: 0.08 },
  proud: { warm: 0.07, playful: 0.06 },
  shrugs: { neutral: 0.06, cold: 0.08, guarded: 0.07 },
  sip: { cold: 0.07, guarded: 0.06 },
  hello: { warm: 0.05, playful: 0.07 },
  love: { warm: 0.08, playful: 0.04 },
};

function matchedTriggerCount(text: string, sticker: StickerDbRow) {
  const customTriggers = (sticker.ai_triggers ?? [])
    .map(normalize)
    .filter(Boolean);
  const triggers =
    customTriggers.length > 0 ? customTriggers : FALLBACK_RULES[sticker.key] ?? [];

  let count = 0;
  for (const trigger of triggers) {
    if (trigger && text.includes(trigger)) count += 1;
  }
  return count;
}

function minutesSince(dateString?: string | null) {
  if (!dateString) return Number.POSITIVE_INFINITY;
  const then = new Date(dateString).getTime();
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY;
  return (Date.now() - then) / 1000 / 60;
}

function getMoodAdjustedChance(args: {
  baseChance: number;
  moodInfluence: number;
  mood: string;
  stickerKey: string;
}) {
  const normalizedMood = normalize(args.mood || "neutral");
  const factor = MOOD_FACTORS[normalizedMood] ?? 1;
  const stickerBonus = STICKER_MOOD_BONUS[args.stickerKey]?.[normalizedMood] ?? 0;

  const moodDelta = (factor - 1) * args.moodInfluence;
  const chance = args.baseChance + moodDelta + stickerBonus;

  return Math.max(0, Math.min(chance, 0.8));
}

export async function chooseStickerForAiReply(args: {
  userMessage: string;
  replyText: string;
  mood: string;
  lastStickerAt?: string | null;
  stickerEnabled: boolean;
  stickerBaseChance: number;
  stickerMoodInfluence: number;
}) {
  if (!args.stickerEnabled) return null;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("stickers")
    .select("id, key, label, image_path, ai_enabled, ai_triggers, sort_order")
    .eq("ai_enabled", true)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) throw new Error(error.message);

  const stickers = (data ?? []) as StickerDbRow[];
  if (!stickers.length) return null;

  const haystack = normalize(`${args.userMessage} ${args.replyText}`);
  const mins = minutesSince(args.lastStickerAt);

  if (mins < 1.5) return null;

  const candidates = stickers
    .map((sticker) => ({
      sticker,
      matches: matchedTriggerCount(haystack, sticker),
    }))
    .filter((item) => item.matches > 0);

  if (!candidates.length) return null;

  const scored = candidates
    .map((item) => {
      const chance = getMoodAdjustedChance({
        baseChance: args.stickerBaseChance,
        moodInfluence: args.stickerMoodInfluence,
        mood: args.mood,
        stickerKey: item.sticker.key,
      });

      return {
        ...item,
        chance,
        score: item.matches * 10 + chance * 100,
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  if (!best) return null;

  let chance = best.chance;

  chance += Math.min(best.matches * 0.04, 0.12);

  if (mins < 3) chance *= 0.35;
  else if (mins < 6) chance *= 0.55;
  else if (mins < 10) chance *= 0.75;

  if (args.replyText.length > 180) chance *= 0.75;
  if (args.replyText.length > 260) chance *= 0.6;

  chance = Math.max(0, Math.min(chance, 0.8));

  const roll = Math.random();

  console.log("[sticker-ai]", {
    mood: args.mood,
    sticker: best.sticker.key,
    matches: best.matches,
    baseChance: args.stickerBaseChance,
    moodInfluence: args.stickerMoodInfluence,
    minutesSinceLastSticker: mins,
    finalChance: Number(chance.toFixed(3)),
    roll: Number(roll.toFixed(3)),
    granted: roll < chance,
  });

  if (roll >= chance) return null;

  return {
    id: best.sticker.id,
    key: best.sticker.key,
    label: best.sticker.label,
    image_path: best.sticker.image_path,
  } satisfies AiStickerChoice;
}