// app/admin/characters/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { textareaToArray } from "@/lib/admin/characters";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function sanitizeFileNamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
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

export async function createCharacterAction(formData: FormData) {
  const supabase = createAdminClient();

  const key = getString(formData, "key");
  const name = getString(formData, "name");
  const title = getString(formData, "title");
  const referenceImageUrl = getString(formData, "referenceImageUrl");
  const starterMessage = getString(formData, "starterMessage");
  const baseTone = getString(formData, "baseTone");
  const annoyanceThreshold = Number(getString(formData, "annoyanceThreshold") || "85");
  const preferredVoice = getString(formData, "preferredVoice");

  const styleNotes = textareaToArray(getString(formData, "styleNotes"));
  const likes = textareaToArray(getString(formData, "likes"));
  const dislikes = textareaToArray(getString(formData, "dislikes"));
  const allowedModes = textareaToArray(getString(formData, "allowedModes"));

  const identityNotes = getString(formData, "identityNotes");
  const conversationRules = getString(formData, "conversationRules");
  const relationshipBehavior = getString(formData, "relationshipBehavior");
  const loreContext = getString(formData, "loreContext");
  const hardConstraints = getString(formData, "hardConstraints");
  const blockMessage = getString(formData, "blockMessage");

  const voiceOnly = formData.get("voiceOnly") === "on";
  const autoPlayVoice = formData.get("autoPlayVoice") === "on";

  const stickerEnabled = formData.get("stickerEnabled") === "on";
  const stickerBaseChance = Number(getString(formData, "stickerBaseChance") || "0.12");
  const stickerMoodInfluence = Number(
    getString(formData, "stickerMoodInfluence") || "0.12"
  );

  const avatarFile = formData.get("avatarFile") as File | null;

  if (!key || !name) {
    throw new Error("Character key and name are required.");
  }

  const avatarUrl = await uploadAvatarIfProvided({
    supabase,
    key,
    avatarFile,
  });

  const { data, error } = await supabase
    .from("characters")
    .insert({
      key,
      name,
      title: title || null,
      avatar: avatarUrl,
      reference_image_url: referenceImageUrl || null,
      starter_message: starterMessage || null,
      base_tone: baseTone || null,
      annoyance_threshold: Number.isFinite(annoyanceThreshold)
        ? annoyanceThreshold
        : 85,
      preferred_voice: preferredVoice || null,
      style_notes: styleNotes,
      likes,
      dislikes,
      allowed_modes: allowedModes,
      identity_notes: identityNotes || null,
      conversation_rules: conversationRules || null,
      relationship_behavior: relationshipBehavior || null,
      lore_context: loreContext || null,
      hard_constraints: hardConstraints || null,
      block_message: blockMessage || null,
      voice_only: voiceOnly,
      auto_play_voice: autoPlayVoice,
      sticker_enabled: stickerEnabled,
      sticker_base_chance: Number.isFinite(stickerBaseChance)
        ? stickerBaseChance
        : 0.12,
      sticker_mood_influence: Number.isFinite(stickerMoodInfluence)
        ? stickerMoodInfluence
        : 0.12,
      forms: null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/characters");
  redirect(`/admin/characters/${data.id}`);
}

export async function updateCharacterAction(
  characterId: string,
  formData: FormData
) {
  const supabase = createAdminClient();

  const key = getString(formData, "key");
  const name = getString(formData, "name");
  const title = getString(formData, "title");
  const referenceImageUrl = getString(formData, "referenceImageUrl");
  const starterMessage = getString(formData, "starterMessage");
  const baseTone = getString(formData, "baseTone");
  const annoyanceThreshold = Number(getString(formData, "annoyanceThreshold") || "85");
  const preferredVoice = getString(formData, "preferredVoice");

  const styleNotes = textareaToArray(getString(formData, "styleNotes"));
  const likes = textareaToArray(getString(formData, "likes"));
  const dislikes = textareaToArray(getString(formData, "dislikes"));
  const allowedModes = textareaToArray(getString(formData, "allowedModes"));

  const identityNotes = getString(formData, "identityNotes");
  const conversationRules = getString(formData, "conversationRules");
  const relationshipBehavior = getString(formData, "relationshipBehavior");
  const loreContext = getString(formData, "loreContext");
  const hardConstraints = getString(formData, "hardConstraints");
  const blockMessage = getString(formData, "blockMessage");

  const voiceOnly = formData.get("voiceOnly") === "on";
  const autoPlayVoice = formData.get("autoPlayVoice") === "on";

  const stickerEnabled = formData.get("stickerEnabled") === "on";
  const stickerBaseChance = Number(getString(formData, "stickerBaseChance") || "0.12");
  const stickerMoodInfluence = Number(
    getString(formData, "stickerMoodInfluence") || "0.12"
  );

  const avatarFile = formData.get("avatarFile") as File | null;
  const formsJson = String(formData.get("formsJson") ?? "").trim();
  let forms: Array<{ display_name: string; avatar: string; mood_triggers: string[] }> | null = null;
  if (formsJson) {
    try {
      forms = JSON.parse(formsJson);
    } catch {
      forms = null;
    }
  }

  if (!key || !name) {
    throw new Error("Character key and name are required.");
  }

  const { data: existingCharacter, error: existingError } = await supabase
    .from("characters")
    .select("avatar")
    .eq("id", characterId)
    .single();

  if (existingError) {
    throw new Error(existingError.message);
  }

  let avatarUrl = existingCharacter?.avatar ?? null;

  const uploadedAvatarUrl = await uploadAvatarIfProvided({
    supabase,
    key,
    avatarFile,
  });

  if (uploadedAvatarUrl) {
    avatarUrl = uploadedAvatarUrl;
  }

  const { error } = await supabase
    .from("characters")
    .update({
      key,
      name,
      title: title || null,
      avatar: avatarUrl,
      reference_image_url: referenceImageUrl || null,
      starter_message: starterMessage || null,
      base_tone: baseTone || null,
      annoyance_threshold: Number.isFinite(annoyanceThreshold)
        ? annoyanceThreshold
        : 85,
      preferred_voice: preferredVoice || null,
      style_notes: styleNotes,
      likes,
      dislikes,
      allowed_modes: allowedModes,
      identity_notes: identityNotes || null,
      conversation_rules: conversationRules || null,
      relationship_behavior: relationshipBehavior || null,
      lore_context: loreContext || null,
      hard_constraints: hardConstraints || null,
      block_message: blockMessage || null,
      voice_only: voiceOnly,
      auto_play_voice: autoPlayVoice,
      sticker_enabled: stickerEnabled,
      sticker_base_chance: Number.isFinite(stickerBaseChance)
        ? stickerBaseChance
        : 0.12,
      sticker_mood_influence: Number.isFinite(stickerMoodInfluence)
        ? stickerMoodInfluence
        : 0.12,
      forms: forms,
    })
    .eq("id", characterId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/characters");
  revalidatePath(`/admin/characters/${characterId}`);
}

export async function deleteCharacterAction(characterId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("characters")
    .delete()
    .eq("id", characterId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/characters");
  redirect("/admin/characters");
}