// lib/admin/events.ts

import { createAdminClient } from "@/lib/supabase/admin";

export type GameEventRow = {
  id: string;
  title: string;
  slug: string;
  order: number;
  importance: number;
  details: string | null;
  involved_characters: string[] | null;
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

function textareaToArray(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listEvents(): Promise<GameEventRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("game_events")
    .select("*")
    .order("order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as GameEventRow[];
}

export async function getEventById(id: string): Promise<GameEventRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("game_events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data as GameEventRow | null) ?? null;
}

export async function createEvent(formData: FormData) {
  const supabase = createAdminClient();

  const title = getString(formData, "title");
  const slugInput = getString(formData, "slug");
  const slug = slugInput || slugify(title);

  if (!title) throw new Error("Title is required.");
  if (!slug) throw new Error("Slug is required.");

  const payload = {
    title,
    slug,
    order: getNumber(formData, "order", 0),
    importance: getNumber(formData, "importance", 1),
    details: getNullableString(formData, "details"),
    involved_characters: textareaToArray(
      getString(formData, "involved_characters")
    ),
  };

  const { error } = await supabase.from("game_events").insert(payload);
  if (error) throw new Error(error.message);
}

export async function updateEvent(formData: FormData) {
  const supabase = createAdminClient();

  const id = getString(formData, "id");
  if (!id) throw new Error("Missing event id.");

  const title = getString(formData, "title");
  const slugInput = getString(formData, "slug");
  const slug = slugInput || slugify(title);

  if (!title) throw new Error("Title is required.");
  if (!slug) throw new Error("Slug is required.");

  const payload = {
    title,
    slug,
    order: getNumber(formData, "order", 0),
    importance: getNumber(formData, "importance", 1),
    details: getNullableString(formData, "details"),
    involved_characters: textareaToArray(
      getString(formData, "involved_characters")
    ),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("game_events")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteEvent(formData: FormData) {
  const supabase = createAdminClient();

  const id = getString(formData, "id");
  if (!id) throw new Error("Missing event id.");

  const { error } = await supabase.from("game_events").delete().eq("id", id);
  if (error) throw new Error(error.message);
}