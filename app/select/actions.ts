"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function chooseActiveCharacterAction(formData: FormData) {
  const characterId = String(formData.get("characterId") ?? "").trim();

  if (!characterId) {
    redirect("/select");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("user_active_characters").upsert(
    {
      user_id: user.id,
      character_id: characterId,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    }
  );

  if (error) {
    throw new Error(error.message);
  }

  redirect("/chat");
}