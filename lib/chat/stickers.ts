// lib/chat/stickers.ts

import { createAdminClient } from "@/lib/supabase/admin";

export type StickerRow = {
  id: string;
  key: string;
  label: string;
  image_path: string;
  created_at?: string;
  updated_at?: string;
};

export async function listStickers(): Promise<StickerRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("stickers")
    .select("*")
    .order("label", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as StickerRow[];
}

export async function getStickerById(id: string): Promise<StickerRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("stickers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data as StickerRow | null) ?? null;
}