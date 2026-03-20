// lib/admin/lore.ts

import { createAdminClient } from "@/lib/supabase/admin";

export type LoreEntryRow = {
  key: string;
  content: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function normalizeKey(input: string) {
  return input
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "")
    .toUpperCase();
}

export async function listLoreEntries(): Promise<LoreEntryRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("lore_entries")
    .select("key, content, created_at, updated_at")
    .order("key", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as LoreEntryRow[];
}

export async function getLoreEntryByKey(
  key: string
): Promise<LoreEntryRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("lore_entries")
    .select("key, content, created_at, updated_at")
    .eq("key", key)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data as LoreEntryRow | null) ?? null;
}

export async function createLoreEntry(formData: FormData) {
  "use server";

  const rawKey = String(formData.get("key") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!rawKey) {
    throw new Error("Key is required.");
  }

  const key = normalizeKey(rawKey);

  const supabase = createAdminClient();

  const { error } = await supabase.from("lore_entries").insert({
    key,
    content: content || null,
  });

  if (error) throw new Error(error.message);

  return key;
}

export async function updateLoreEntry(formData: FormData) {
  "use server";

  const originalKey = String(formData.get("original_key") ?? "").trim();
  const rawKey = String(formData.get("key") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!originalKey) {
    throw new Error("Original key is required.");
  }

  if (!rawKey) {
    throw new Error("Key is required.");
  }

  const nextKey = normalizeKey(rawKey);

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("lore_entries")
    .update({
      key: nextKey,
      content: content || null,
      updated_at: new Date().toISOString(),
    })
    .eq("key", originalKey);

  if (error) throw new Error(error.message);

  return nextKey;
}

export async function deleteLoreEntry(formData: FormData) {
  "use server";

  const key = String(formData.get("key") ?? "").trim();

  if (!key) {
    throw new Error("Key is required.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("lore_entries").delete().eq("key", key);

  if (error) throw new Error(error.message);
}