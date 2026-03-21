// lib/admin/characters.ts

import { createAdminClient } from "@/lib/supabase/admin";

export type AdminCharacterRow = {
  id: string;
  key: string;
  name: string;
  title: string | null;
  avatar: string | null;
  reference_image_url: string | null;
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
  annoyance_threshold: number | null;
  block_message: string | null;
  voice_only: boolean | null;
  auto_play_voice: boolean | null;
  preferred_voice: string | null;
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
  created_at?: string | null;
  updated_at?: string | null;
};

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getNullableString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || null;
}

function getNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(getString(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function sanitizeFileNamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function textareaToArray(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function uploadAvatarIfProvided(args: {
  supabase: ReturnType<typeof createAdminClient>;
  key: string;
  avatarFile: File | null;
}) {
  const { supabase, key, avatarFile } = args;

  if (!avatarFile || avatarFile.size <= 0) {
    return null;
  }

  const bytes = await avatarFile.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const safeKey = sanitizeFileNamePart(key || "character");
  const ext =
    avatarFile.name.split(".").pop()?.toLowerCase() ||
    avatarFile.type.split("/").pop() ||
    "png";

  const filePath = `avatars/${safeKey}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("character-assets")
    .upload(filePath, buffer, {
      contentType: avatarFile.type || "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage
    .from("character-assets")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function listAdminCharacters(): Promise<AdminCharacterRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as AdminCharacterRow[];
}

export async function getAdminCharacterById(
  id: string
): Promise<AdminCharacterRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("characters")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data as AdminCharacterRow | null) ?? null;
}

export async function createAdminCharacter(formData: FormData) {
  const supabase = createAdminClient();

  const key = getString(formData, "key");
  const name = getString(formData, "name");

  if (!key || !name) {
    throw new Error("Character key and name are required.");
  }

  const avatarFile = formData.get("avatarFile") as File | null;
  const avatarUrl = await uploadAvatarIfProvided({
    supabase,
    key,
    avatarFile,
  });

  const payload = {
    key,
    name,
    title: getNullableString(formData, "title"),
    avatar: avatarUrl,
    reference_image_url: getNullableString(formData, "referenceImageUrl"),
    starter_message: getNullableString(formData, "starterMessage"),
    base_tone: getNullableString(formData, "baseTone"),
    style_notes: textareaToArray(getString(formData, "styleNotes")),
    likes: textareaToArray(getString(formData, "likes")),
    dislikes: textareaToArray(getString(formData, "dislikes")),
    allowed_modes: textareaToArray(getString(formData, "allowedModes")),
    identity_notes: getNullableString(formData, "identityNotes"),
    conversation_rules: getNullableString(formData, "conversationRules"),
    relationship_behavior: getNullableString(formData, "relationshipBehavior"),
    lore_context: getNullableString(formData, "loreContext"),
    hard_constraints: getNullableString(formData, "hardConstraints"),
    annoyance_threshold: getNumber(formData, "annoyanceThreshold", 85),
    block_message: getNullableString(formData, "blockMessage"),
    voice_only: getBoolean(formData, "voiceOnly"),
    auto_play_voice: getBoolean(formData, "autoPlayVoice"),
    preferred_voice: getNullableString(formData, "preferredVoice"),
    sticker_enabled: getBoolean(formData, "stickerEnabled"),
    sticker_base_chance: getNumber(formData, "stickerBaseChance", 0.12),
    sticker_mood_influence: getNumber(formData, "stickerMoodInfluence", 0.12),
    forms: null,
  };

  const { error } = await supabase.from("characters").insert(payload);
  if (error) throw new Error(error.message);
}

export async function updateAdminCharacter(formData: FormData) {
  const supabase = createAdminClient();
  const id = getString(formData, "id");
  if (!id) throw new Error("Missing character id.");

  const key = getString(formData, "key");
  const name = getString(formData, "name");

  if (!key || !name) {
    throw new Error("Character key and name are required.");
  }

  const { data: existingCharacter, error: existingError } = await supabase
    .from("characters")
    .select("avatar")
    .eq("id", id)
    .single();

  if (existingError) throw new Error(existingError.message);

  let avatarUrl = existingCharacter?.avatar ?? null;

  const avatarFile = formData.get("avatarFile") as File | null;
  const uploadedAvatarUrl = await uploadAvatarIfProvided({
    supabase,
    key,
    avatarFile,
  });

  if (uploadedAvatarUrl) {
    avatarUrl = uploadedAvatarUrl;
  }

  const payload = {
    key,
    name,
    title: getNullableString(formData, "title"),
    avatar: avatarUrl,
    reference_image_url: getNullableString(formData, "referenceImageUrl"),
    starter_message: getNullableString(formData, "starterMessage"),
    base_tone: getNullableString(formData, "baseTone"),
    style_notes: textareaToArray(getString(formData, "styleNotes")),
    likes: textareaToArray(getString(formData, "likes")),
    dislikes: textareaToArray(getString(formData, "dislikes")),
    allowed_modes: textareaToArray(getString(formData, "allowedModes")),
    identity_notes: getNullableString(formData, "identityNotes"),
    conversation_rules: getNullableString(formData, "conversationRules"),
    relationship_behavior: getNullableString(formData, "relationshipBehavior"),
    lore_context: getNullableString(formData, "loreContext"),
    hard_constraints: getNullableString(formData, "hardConstraints"),
    annoyance_threshold: getNumber(formData, "annoyanceThreshold", 85),
    block_message: getNullableString(formData, "blockMessage"),
    voice_only: getBoolean(formData, "voiceOnly"),
    auto_play_voice: getBoolean(formData, "autoPlayVoice"),
    preferred_voice: getNullableString(formData, "preferredVoice"),
    sticker_enabled: getBoolean(formData, "stickerEnabled"),
    sticker_base_chance: getNumber(formData, "stickerBaseChance", 0.12),
    sticker_mood_influence: getNumber(formData, "stickerMoodInfluence", 0.12),
    forms: (() => {
      const raw = getString(formData, "formsJson");
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
      } catch {
        return null;
      }
    })(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("characters").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteAdminCharacter(formData: FormData) {
  const supabase = createAdminClient();
  const id = getString(formData, "id");
  if (!id) throw new Error("Missing character id.");

  const { error } = await supabase.from("characters").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export { textareaToArray };