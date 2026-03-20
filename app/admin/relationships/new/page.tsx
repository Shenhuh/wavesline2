// app/admin/relationships/new/page.tsx

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import RelationshipForm from "../RelationshipForm";
import { createRelationshipAction } from "../actions";
import {
  DEFAULT_RELATIONSHIP_FORM,
  type CharacterOption,
} from "@/lib/admin/relationships";

export default async function NewRelationshipPage() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("characters")
    .select("id, name, key")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const characters = (data ?? []) as CharacterOption[];

  return (
    <main className="min-h-screen bg-[#d7dbe2] p-6">
      <div className="mx-auto max-w-4xl rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#2a313d]">
              Create Relationship
            </h1>
            <p className="mt-1 text-sm text-[#677388]">
              Add a new relationship entry between two characters.
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
          values={DEFAULT_RELATIONSHIP_FORM}
          characters={characters}
          submitLabel="Create Relationship"
          action={createRelationshipAction}
        />
      </div>
    </main>
  );
}