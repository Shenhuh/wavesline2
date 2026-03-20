// lib/admin/stickers.ts

import { createAdminClient } from "@/lib/supabase/admin";

export type AdminStickerRow = {
  id: string;
  key: string;
  label: string;
  image_path: string;
  ai_enabled: boolean;
  ai_triggers: string[];
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

const BUCKET = "sticker-assets";

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function splitLines(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

async function uploadStickerImage(file: File | null, stickerKey: string) {
  if (!file || file.size === 0) return null;

  const supabase = createAdminClient();
  const safeName = sanitizeFileName(file.name);
  const path = `${stickerKey}/${Date.now()}-${safeName}`;

  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function listAdminStickers(): Promise<AdminStickerRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("stickers")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as AdminStickerRow[];
}

export async function getAdminStickerById(
  id: string
): Promise<AdminStickerRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("stickers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data as AdminStickerRow | null) ?? null;
}

export async function createAdminSticker(formData: FormData) {
  "use server";

  const key = String(formData.get("key") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const sortOrder = Number(String(formData.get("sort_order") ?? "0").trim());
  const aiEnabled = formData.get("ai_enabled") === "on";
  const aiTriggers = splitLines(formData.get("ai_triggers"));
  const imageFile = formData.get("image_file");

  if (!key || !label) {
    throw new Error("Key and label are required.");
  }

  const uploadedImagePath = await uploadStickerImage(
    imageFile instanceof File ? imageFile : null,
    key
  );

  if (!uploadedImagePath) {
    throw new Error("Sticker image is required.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("stickers").insert({
    key,
    label,
    image_path: uploadedImagePath,
    ai_enabled: aiEnabled,
    ai_triggers: aiTriggers,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  });

  if (error) throw new Error(error.message);
}

export async function updateAdminSticker(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const key = String(formData.get("key") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const sortOrder = Number(String(formData.get("sort_order") ?? "0").trim());
  const aiEnabled = formData.get("ai_enabled") === "on";
  const aiTriggers = splitLines(formData.get("ai_triggers"));
  const imageFile = formData.get("image_file");

  if (!id || !key || !label) {
    throw new Error("Id, key, and label are required.");
  }

  const existing = await getAdminStickerById(id);
  if (!existing) {
    throw new Error("Sticker not found.");
  }

  const uploadedImagePath = await uploadStickerImage(
    imageFile instanceof File ? imageFile : null,
    key
  );

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("stickers")
    .update({
      key,
      label,
      image_path: uploadedImagePath ?? existing.image_path,
      ai_enabled: aiEnabled,
      ai_triggers: aiTriggers,
      sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteAdminSticker(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing sticker id.");

  const supabase = createAdminClient();

  const { error } = await supabase.from("stickers").delete().eq("id", id);

  if (error) throw new Error(error.message);
}