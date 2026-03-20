// lib/admin/relationships.ts

export type CharacterOption = {
  id: string;
  name: string;
  key: string;
  
};

export type RelationshipRow = {
  id: string;
  source_character_id: string;
  target_character_id: string;
  relationship_label: string | null;
  affinity: number;
  trust: number;
  familiarity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RelationshipFormValues = {
  sourceCharacterId: string;
  targetCharacterId: string;
  relationshipLabel: string;
  affinity: string;
  trust: string;
  familiarity: string;
  notes: string;
};

export const DEFAULT_RELATIONSHIP_FORM: RelationshipFormValues = {
  sourceCharacterId: "",
  targetCharacterId: "",
  relationshipLabel: "",
  affinity: "0",
  trust: "0",
  familiarity: "0",
  notes: "",
};

export function rowToRelationshipFormValues(
  row: RelationshipRow
): RelationshipFormValues {
  return {
    sourceCharacterId: row.source_character_id,
    targetCharacterId: row.target_character_id,
    relationshipLabel: row.relationship_label ?? "",
    affinity: String(row.affinity ?? 0),
    trust: String(row.trust ?? 0),
    familiarity: String(row.familiarity ?? 0),
    notes: row.notes ?? "",
  };
}

export function clampStat(value: number, min = -100, max = 100) {
  return Math.max(min, Math.min(max, value));
}