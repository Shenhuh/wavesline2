// lib/admin/monsters.ts

import { createAdminClient } from "@/lib/supabase/admin";

export type MonsterRow = {
  id: string;
  name: string;
  element: string | null;
  location: string | null;
  lore: string | null;
  class: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function listMonsters(): Promise<MonsterRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("monsters")
    .select("id, name, element, location, lore, class, created_at, updated_at")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as MonsterRow[];
}

export async function getMonsterById(id: string): Promise<MonsterRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("monsters")
    .select("id, name, element, location, lore, class, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data as MonsterRow | null) ?? null;
}

export async function createMonster(formData: FormData) {
  "use server";

  const name = String(formData.get("name") ?? "").trim();
  const element = String(formData.get("element") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const lore = String(formData.get("lore") ?? "").trim();
  const monsterClass = String(formData.get("class") ?? "").trim();

  if (!name) {
    throw new Error("Monster name is required.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("monsters").insert({
    name,
    element: element || null,
    location: location || null,
    lore: lore || null,
    class: monsterClass || null,
  });

  if (error) throw new Error(error.message);
}

export async function updateMonster(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const element = String(formData.get("element") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const lore = String(formData.get("lore") ?? "").trim();
  const monsterClass = String(formData.get("class") ?? "").trim();

  if (!id) {
    throw new Error("Monster id is required.");
  }

  if (!name) {
    throw new Error("Monster name is required.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("monsters")
    .update({
      name,
      element: element || null,
      location: location || null,
      lore: lore || null,
      class: monsterClass || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteMonster(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("Monster id is required.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("monsters").delete().eq("id", id);

  if (error) throw new Error(error.message);
}