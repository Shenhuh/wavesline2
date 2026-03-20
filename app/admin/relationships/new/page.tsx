// app/admin/relationships/new/page.tsx
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import RelationshipForm from "../RelationshipForm";
import { createRelationshipAction } from "../actions";
import { DEFAULT_RELATIONSHIP_FORM, type CharacterOption } from "@/lib/admin/relationships";

export default async function NewRelationshipPage() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("characters").select("id, name, key").order("name", { ascending: true });
  if (error) throw new Error(error.message);
  const characters = (data ?? []) as CharacterOption[];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#23252f", margin: 0, letterSpacing: "-0.3px" }}>New Relationship</h1>
          <p style={{ fontSize: 13, color: "rgba(35,37,47,0.5)", margin: "4px 0 0" }}>Add a relationship entry between two characters.</p>
        </div>
        <Link href="/admin/relationships" style={{ fontSize: 13, fontWeight: 500, color: "rgba(35,37,47,0.5)", textDecoration: "none" }}>
          ← All relationships
        </Link>
      </div>
      <RelationshipForm values={DEFAULT_RELATIONSHIP_FORM} characters={characters} submitLabel="Create Relationship" action={createRelationshipAction} />
    </div>
  );
}