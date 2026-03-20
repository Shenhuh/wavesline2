// app/admin/relationships/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { clampStat } from "@/lib/admin/relationships";

function getString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(String(formData.get(key) ?? "").trim());
  return Number.isFinite(value) ? value : fallback;
}

export async function createRelationshipAction(formData: FormData) {
  const supabase = createAdminClient();

  const sourceCharacterId = getString(formData, "sourceCharacterId");
  const targetCharacterId = getString(formData, "targetCharacterId");
  const relationshipLabel = getString(formData, "relationshipLabel");
  const affinity = clampStat(getNumber(formData, "affinity", 0));
  const trust = clampStat(getNumber(formData, "trust", 0));
  const familiarity = clampStat(getNumber(formData, "familiarity", 0));
  const notes = getString(formData, "notes");

  if (!sourceCharacterId || !targetCharacterId) {
    throw new Error("Both source and target characters are required.");
  }

  if (sourceCharacterId === targetCharacterId) {
    throw new Error("A character cannot have a relationship with itself.");
  }

  const { data, error } = await supabase
    .from("character_relationships")
    .insert({
      source_character_id: sourceCharacterId,
      target_character_id: targetCharacterId,
      relationship_label: relationshipLabel || null,
      affinity,
      trust,
      familiarity,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/relationships");
  redirect(`/admin/relationships/${data.id}`);
}

export async function updateRelationshipAction(
  relationshipId: string,
  formData: FormData
) {
  const supabase = createAdminClient();

  const sourceCharacterId = getString(formData, "sourceCharacterId");
  const targetCharacterId = getString(formData, "targetCharacterId");
  const relationshipLabel = getString(formData, "relationshipLabel");
  const affinity = clampStat(getNumber(formData, "affinity", 0));
  const trust = clampStat(getNumber(formData, "trust", 0));
  const familiarity = clampStat(getNumber(formData, "familiarity", 0));
  const notes = getString(formData, "notes");

  if (!sourceCharacterId || !targetCharacterId) {
    throw new Error("Both source and target characters are required.");
  }

  if (sourceCharacterId === targetCharacterId) {
    throw new Error("A character cannot have a relationship with itself.");
  }

  const { error } = await supabase
    .from("character_relationships")
    .update({
      source_character_id: sourceCharacterId,
      target_character_id: targetCharacterId,
      relationship_label: relationshipLabel || null,
      affinity,
      trust,
      familiarity,
      notes: notes || null,
    })
    .eq("id", relationshipId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/relationships");
  revalidatePath(`/admin/relationships/${relationshipId}`);
}

export async function deleteRelationshipAction(relationshipId: string) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("character_relationships")
    .delete()
    .eq("id", relationshipId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/relationships");
  redirect("/admin/relationships");
}