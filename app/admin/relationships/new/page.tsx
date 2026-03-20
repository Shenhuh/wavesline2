// app/admin/relationships/new/page.tsx
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import BulkRelationshipForm from "../BulkRelationshipForm";
import { saveBulkRelationshipsAction } from "../actions";

export type CharacterOption = {
  id: string;
  name: string;
  key: string;
  avatar: string | null;
};

export type ExistingRelationship = {
  source_character_id: string;
  target_character_id: string;
  affinity: number | null;
  trust: number | null;
  familiarity: number | null;
  notes: string | null;
  enabled: boolean | null;
};

export default async function NewRelationshipPage() {
  const supabase = createAdminClient();

  const [{ data: characterData, error: characterError }, { data: relationshipData, error: relationshipError }] =
    await Promise.all([
      supabase
        .from("characters")
        .select("id, name, key, avatar")
        .order("name", { ascending: true }),
      supabase
        .from("character_relationships")
        .select(
          "source_character_id, target_character_id, affinity, trust, familiarity, notes, enabled"
        ),
    ]);

  if (characterError) throw new Error(characterError.message);
  if (relationshipError) throw new Error(relationshipError.message);

  const characters = (characterData ?? []) as CharacterOption[];
  const existingRelationships =
    (relationshipData ?? []) as ExistingRelationship[];

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#23252f",
              margin: 0,
              letterSpacing: "-0.3px",
            }}
          >
            Bulk Relationships
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "rgba(35,37,47,0.5)",
              margin: "4px 0 0",
            }}
          >
            Pick one source character, then edit their relationship toward every
            other character on the same page.
          </p>
        </div>

        <Link
          href="/admin/relationships"
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "rgba(35,37,47,0.5)",
            textDecoration: "none",
          }}
        >
          ← All relationships
        </Link>
      </div>

      <BulkRelationshipForm
        characters={characters}
        existingRelationships={existingRelationships}
        action={saveBulkRelationshipsAction}
      />
    </div>
  );
}