// app/admin/relationships/[id]/page.tsx
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import RelationshipForm from "../RelationshipForm";
import { deleteRelationshipAction, updateRelationshipAction } from "../actions";
import { rowToRelationshipFormValues, type CharacterOption, type RelationshipRow } from "@/lib/admin/relationships";

export default async function EditRelationshipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: relData, error: relError }, { data: charData, error: charError }] = await Promise.all([
    supabase.from("character_relationships").select("*").eq("id", id).single(),
    supabase.from("characters").select("id, name, key").order("name", { ascending: true }),
  ]);

  if (relError || !relData) throw new Error(relError?.message || "Relationship not found.");
  if (charError) throw new Error(charError.message);

  const relationship = relData as RelationshipRow;
  const characters = (charData ?? []) as CharacterOption[];
  const values = rowToRelationshipFormValues(relationship);
  const updateAction = updateRelationshipAction.bind(null, id);
  const removeAction = deleteRelationshipAction.bind(null, id);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#23252f", margin: 0, letterSpacing: "-0.3px" }}>Edit Relationship</h1>
          <p style={{ fontSize: 13, color: "rgba(35,37,47,0.5)", margin: "4px 0 0" }}>Update relationship values and notes.</p>
        </div>
        <Link href="/admin/relationships" style={{ fontSize: 13, fontWeight: 500, color: "rgba(35,37,47,0.5)", textDecoration: "none" }}>
          ← All relationships
        </Link>
      </div>

      <RelationshipForm values={values} characters={characters} submitLabel="Save Changes" action={updateAction} />

      <div style={{ marginTop: 20, background: "white", borderRadius: 12, border: "1px solid rgba(220,38,38,0.15)", padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#23252f" }}>Delete this relationship</div>
          <div style={{ fontSize: 12, color: "rgba(35,37,47,0.4)", marginTop: 2 }}>This action cannot be undone.</div>
        </div>
        <form action={removeAction}>
          <button type="submit" style={{ borderRadius: 8, padding: "8px 18px", fontSize: 13, fontWeight: 600, color: "#991b1b", background: "white", border: "1px solid rgba(220,38,38,0.3)", cursor: "pointer", fontFamily: "inherit" }}>
            Delete
          </button>
        </form>
      </div>
    </div>
  );
}