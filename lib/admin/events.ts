// lib/admin/events.ts

import { createAdminClient } from "@/lib/supabase/admin";

export type GameEventRow = {
  id: string;
  title: string;
  slug: string | null;
  summary: string;
  details: string | null;
  region: string | null;
  faction: string | null;
  importance: number;
  status: "upcoming" | "active" | "ended";
  affected_character_keys: string[];
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

function splitLines(value: string) {
  return value
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function listEvents(): Promise<GameEventRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("game_events")
    .select("*")
    .order("status", { ascending: true })
    .order("importance", { ascending: false })
    .order("starts_at", { ascending: false, nullsFirst: false });

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
  "use server";

  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();

  if (!title || !summary) {
    throw new Error("Title and summary are required.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("game_events").insert({
    title,
    slug: slugify(String(formData.get("slug") ?? "").trim() || title),
    summary,
    details: String(formData.get("details") ?? "").trim() || null,
    region: String(formData.get("region") ?? "").trim() || null,
    faction: String(formData.get("faction") ?? "").trim() || null,
    importance: Number(formData.get("importance") ?? 1),
    status: String(formData.get("status") ?? "active").trim() || "active",
    affected_character_keys: splitLines(
      String(formData.get("affected_character_keys") ?? "")
    ),
    starts_at: String(formData.get("starts_at") ?? "").trim() || null,
    ends_at: String(formData.get("ends_at") ?? "").trim() || null,
  });

  if (error) throw new Error(error.message);
}

export async function updateEvent(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();

  if (!id || !title || !summary) {
    throw new Error("Missing id, title, or summary.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("game_events")
    .update({
      title,
      slug: slugify(String(formData.get("slug") ?? "").trim() || title),
      summary,
      details: String(formData.get("details") ?? "").trim() || null,
      region: String(formData.get("region") ?? "").trim() || null,
      faction: String(formData.get("faction") ?? "").trim() || null,
      importance: Number(formData.get("importance") ?? 1),
      status: String(formData.get("status") ?? "active").trim() || "active",
      affected_character_keys: splitLines(
        String(formData.get("affected_character_keys") ?? "")
      ),
      starts_at: String(formData.get("starts_at") ?? "").trim() || null,
      ends_at: String(formData.get("ends_at") ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteEvent(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  if (!id) throw new Error("Missing event id.");

  const supabase = createAdminClient();

  const { error } = await supabase.from("game_events").delete().eq("id", id);

  if (error) throw new Error(error.message);
}