// app/admin/relationships/[id]/page.tsx

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import RelationshipForm from "../RelationshipForm";
import {
  deleteRelationshipAction,
  updateRelationshipAction,
} from "../actions";
import {
  rowToRelationshipFormValues,
  type CharacterOption,
  type RelationshipRow,
} from "@/lib/admin/relationships";

export default async function EditRelationshipPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: relationshipData, error: relationshipError }, { data: charactersData, error: charactersError }] =
    await Promise.all([
      supabase
        .from("character_relationships")
        .select("*")
        .eq("id", id)
        .single(),
      supabase
        .from("characters")
        .select("id, name, key")
        .order("name", { ascending: true }),
    ]);

  if (relationshipError || !relationshipData) {
    throw new Error(relationshipError?.message || "Relationship not found.");
  }

  if (charactersError) {
    throw new Error(charactersError.message);
  }

  const relationship = relationshipData as RelationshipRow;
  const characters = (charactersData ?? []) as CharacterOption[];
  const values = rowToRelationshipFormValues(relationship);

  const updateAction = updateRelationshipAction.bind(null, id);
  const removeAction = deleteRelationshipAction.bind(null, id);

  return (
    <main className="min-h-screen bg-[#d7dbe2] p-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#2a313d]">
              Edit Relationship
            </h1>
            <p className="mt-1 text-sm text-[#677388]">
              Update relationship values and notes.
            </p>
          </div>

          <Link
            href="/admin/relationships"
            className="rounded-xl border border-black/10 px-4 py-2 font-semibold text-[#2a313d]"
          >
            Back
          </Link>
        </div>

        <RelationshipForm
          values={values}
          characters={characters}
          submitLabel="Save Changes"
          action={updateAction}
        />

        <div className="mt-8 border-t border-black/10 pt-6">
          <form action={removeAction}>
            <button
              type="submit"
              className="rounded-xl border border-red-300 px-4 py-2 font-semibold text-red-700"
            >
              Delete Relationship
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}