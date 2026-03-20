// app/admin/relationships/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

type BulkRelationshipRow = {
  targetCharacterId: string;
  affinity: number;
  trust: number;
  familiarity: number;
  notes: string;
  enabled: boolean;
};

function clampStat(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-100, Math.min(100, value));
}

export async function saveBulkRelationshipsAction(formData: FormData) {
  const supabase = createAdminClient();

  const sourceCharacterId = String(
    formData.get("sourceCharacterId") ?? ""
  ).trim();

  const relationshipsJson = String(
    formData.get("relationshipsJson") ?? "[]"
  );

  if (!sourceCharacterId) {
    throw new Error("Missing source character.");
  }

  let rows: BulkRelationshipRow[] = [];

  try {
    rows = JSON.parse(relationshipsJson) as BulkRelationshipRow[];
  } catch {
    throw new Error("Invalid relationship payload.");
  }

  for (const row of rows) {
    const targetCharacterId = String(row.targetCharacterId ?? "").trim();
    if (!targetCharacterId) continue;
    if (targetCharacterId === sourceCharacterId) continue;

    const payload = {
      source_character_id: sourceCharacterId,
      target_character_id: targetCharacterId,
      affinity: clampStat(Number(row.affinity)),
      trust: clampStat(Number(row.trust)),
      familiarity: clampStat(Number(row.familiarity)),
      notes: String(row.notes ?? "").trim() || null,
      enabled: row.enabled,
      updated_at: new Date().toISOString(),
    };

    const { data: existing, error: existingError } = await supabase
      .from("character_relationships")
      .select("id")
      .eq("source_character_id", sourceCharacterId)
      .eq("target_character_id", targetCharacterId)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("character_relationships")
        .update(payload)
        .eq("id", existing.id);

      if (updateError) throw new Error(updateError.message);
    } else {
      // Only insert if there's actually something to save
      if (
        row.affinity !== 0 ||
        row.trust !== 0 ||
        row.familiarity !== 0 ||
        row.notes.trim() !== "" ||
        row.enabled
      ) {
        const { error: insertError } = await supabase
          .from("character_relationships")
          .insert({ ...payload, created_at: new Date().toISOString() });

        if (insertError) throw new Error(insertError.message);
      }
    }
  }

  revalidatePath("/admin/relationships");
  revalidatePath("/admin/relationships/new");
}