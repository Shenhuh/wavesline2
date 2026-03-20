// app/admin/relationships/page.tsx

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RelationshipRow } from "@/lib/admin/relationships";

type JoinedRelationshipRow = RelationshipRow & {
  source: { name: string; key: string } | null;
  target: { name: string; key: string } | null;
};

export default async function AdminRelationshipsPage() {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("character_relationships")
    .select(`
      *,
      source:source_character_id ( name, key ),
      target:target_character_id ( name, key )
    `)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const relationships = (data ?? []) as JoinedRelationshipRow[];

  return (
    <main className="min-h-screen bg-[#d7dbe2] p-6">
      <div className="mx-auto max-w-6xl rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#2a313d]">Relationships</h1>
            <p className="mt-1 text-sm text-[#677388]">
              Manage how characters relate to one another.
            </p>
          </div>

          <Link
            href="/admin/relationships/new"
            className="rounded-xl bg-[#2a313d] px-4 py-2 font-semibold text-white"
          >
            <span className="!text-white">Create Relationship</span>
          </Link>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
          {relationships.length === 0 ? (
            <div className="p-6 text-sm text-[#677388]">
              No relationships yet.
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead className="bg-[#f8fafc]">
                <tr className="text-left text-sm text-[#2a313d]">
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Affinity</th>
                  <th className="px-4 py-3">Trust</th>
                  <th className="px-4 py-3">Familiarity</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {relationships.map((relationship) => (
                  <tr
                    key={relationship.id}
                    className="border-t border-black/10 text-sm text-[#2a313d]"
                  >
                    <td className="px-4 py-3">
                      {relationship.source?.name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3">
                      {relationship.target?.name ?? "Unknown"}
                    </td>
                    <td className="px-4 py-3">
                      {relationship.relationship_label ?? "—"}
                    </td>
                    <td className="px-4 py-3">{relationship.affinity}</td>
                    <td className="px-4 py-3">{relationship.trust}</td>
                    <td className="px-4 py-3">{relationship.familiarity}</td>
                    <td className="px-4 py-3">
                      {new Date(relationship.updated_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/relationships/${relationship.id}`}
                        className="font-semibold text-[#2a313d] underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}