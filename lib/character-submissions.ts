// lib/character-submissions.ts

import { createAdminClient } from "@/lib/supabase/admin";

export const CONTRIBUTABLE_FIELDS = [
  "title",
  "starter_message",
  "style_notes",
  "likes",
  "dislikes",
  "identity_notes",
  "conversation_rules",
  "relationship_behavior",
  "lore_context",
  "hard_constraints",
  "block_message",
] as const;

export type ContributableField = (typeof CONTRIBUTABLE_FIELDS)[number];

export const ARRAY_FIELDS: ContributableField[] = [
  "style_notes",
  "likes",
  "dislikes",
];

export const FIELD_LABELS: Record<ContributableField, string> = {
  title: "Title",
  starter_message: "Starter Message",
  style_notes: "Style Notes",
  likes: "Likes",
  dislikes: "Dislikes",
  identity_notes: "Identity Notes",
  conversation_rules: "Conversation Rules",
  relationship_behavior: "Relationship Behavior",
  lore_context: "Lore Context",
  hard_constraints: "Hard Constraints",
  block_message: "Block Message",
};

export type SubmissionRow = {
  id: string;
  character_id: string;
  field_name: ContributableField;
  current_value: string | null;
  proposed_value: string;
  reason: string | null;
  submitted_by_name: string | null;
  status: "pending" | "approved" | "rejected";
  upvotes: number;
  downvotes: number;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CharacterContributionRow = {
  id: string;
  key: string;
  name: string;
  title: string | null;
  avatar: string | null;
  starter_message: string | null;
  style_notes: string[] | null;
  likes: string[] | null;
  dislikes: string[] | null;
  identity_notes: string | null;
  conversation_rules: string | null;
  relationship_behavior: string | null;
  lore_context: string | null;
  hard_constraints: string | null;
  block_message: string | null;
};

function isAllowedField(field: string): field is ContributableField {
  return CONTRIBUTABLE_FIELDS.includes(field as ContributableField);
}

function arrayToTextarea(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter(Boolean).join("\n") : "";
}

function textareaToArray(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

export function formatCharacterFieldValue(
  character: CharacterContributionRow,
  fieldName: ContributableField
) {
  const raw = character[fieldName];

  if (ARRAY_FIELDS.includes(fieldName)) {
    return arrayToTextarea(raw as string[] | null | undefined);
  }

  return typeof raw === "string" ? raw : "";
}

export async function getCharacterByKeyForContribution(
  key: string
): Promise<CharacterContributionRow | null> {
  const safeKey = String(key ?? "").trim().toLowerCase();
  if (!safeKey) return null;

  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from("characters")
      .select(
        `
        id,
        key,
        name,
        title,
        avatar,
        starter_message,
        style_notes,
        likes,
        dislikes,
        identity_notes,
        conversation_rules,
        relationship_behavior,
        lore_context,
        hard_constraints,
        block_message
      `
      )
      .eq("key", safeKey)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[contribution-character-load-error]", {
        key: safeKey,
        message: error.message,
      });
      return null;
    }

    return (data as CharacterContributionRow | null) ?? null;
  } catch (error) {
    console.error("[contribution-character-load-exception]", {
      key: safeKey,
      error,
    });
    return null;
  }
}

export async function listSubmissionsForCharacter(
  characterId: string
): Promise<SubmissionRow[]> {
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from("character_field_submissions")
      .select("*")
      .eq("character_id", characterId)
      .order("upvotes", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[contribution-submissions-load-error]", {
        characterId,
        message: error.message,
      });
      return [];
    }

    return (data ?? []) as SubmissionRow[];
  } catch (error) {
    console.error("[contribution-submissions-load-exception]", {
      characterId,
      error,
    });
    return [];
  }
}

export async function listPendingSubmissions(): Promise<
  Array<
    SubmissionRow & {
      character: { id: string; name: string; key: string } | null;
    }
  >
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("character_field_submissions")
    .select(
      `
      *,
      character:characters (
        id,
        name,
        key
      )
    `
    )
    .eq("status", "pending")
    .order("upvotes", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    character: Array.isArray(row.character) ? row.character[0] ?? null : row.character,
  }));
}

export async function createFieldSubmission(args: {
  characterKey: string;
  fieldName: string;
  proposedValue: string;
  reason?: string;
  submittedByName?: string;
}) {
  if (!isAllowedField(args.fieldName)) {
    throw new Error("Invalid field.");
  }

  const character = await getCharacterByKeyForContribution(args.characterKey);
  if (!character) {
    throw new Error("Character not found.");
  }

  const proposedValue = normalizeText(args.proposedValue);
  if (!proposedValue) {
    throw new Error("Proposed value is required.");
  }

  const currentValue = formatCharacterFieldValue(character, args.fieldName);

  const supabase = createAdminClient();

  const { error } = await supabase.from("character_field_submissions").insert({
    character_id: character.id,
    field_name: args.fieldName,
    current_value: currentValue || null,
    proposed_value: proposedValue,
    reason: normalizeText(args.reason ?? "") || null,
    submitted_by_name: normalizeText(args.submittedByName ?? "") || null,
    status: "pending",
  });

  if (error) throw new Error(error.message);
}

async function refreshSubmissionVoteCounts(submissionId: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("character_submission_votes")
    .select("vote_type")
    .eq("submission_id", submissionId);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<{ vote_type: "upvote" | "downvote" }>;

  const upvotes = rows.filter((r) => r.vote_type === "upvote").length;
  const downvotes = rows.filter((r) => r.vote_type === "downvote").length;

  const { error: updateError } = await supabase
    .from("character_field_submissions")
    .update({
      upvotes,
      downvotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (updateError) throw new Error(updateError.message);
}

export async function castSubmissionVote(args: {
  submissionId: string;
  voterKey: string;
  voteType: "upvote" | "downvote";
}) {
  const supabase = createAdminClient();

  const { data: existing, error: existingError } = await supabase
    .from("character_submission_votes")
    .select("id, vote_type")
    .eq("submission_id", args.submissionId)
    .eq("voter_key", args.voterKey)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);

  if (existing?.vote_type === args.voteType) {
    const { error: deleteError } = await supabase
      .from("character_submission_votes")
      .delete()
      .eq("id", existing.id);

    if (deleteError) throw new Error(deleteError.message);
  } else if (existing) {
    const { error: updateError } = await supabase
      .from("character_submission_votes")
      .update({
        vote_type: args.voteType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) throw new Error(updateError.message);
  } else {
    const { error: insertError } = await supabase
      .from("character_submission_votes")
      .insert({
        submission_id: args.submissionId,
        voter_key: args.voterKey,
        vote_type: args.voteType,
      });

    if (insertError) throw new Error(insertError.message);
  }

  await refreshSubmissionVoteCounts(args.submissionId);
}

export async function approveSubmission(args: {
  submissionId: string;
  approvedBy: string;
}) {
  const supabase = createAdminClient();

  const { data: submission, error: submissionError } = await supabase
    .from("character_field_submissions")
    .select("*")
    .eq("id", args.submissionId)
    .maybeSingle();

  if (submissionError) throw new Error(submissionError.message);
  if (!submission) throw new Error("Submission not found.");

  const row = submission as SubmissionRow;

  if (!isAllowedField(row.field_name)) {
    throw new Error("Invalid submission field.");
  }

  let updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (ARRAY_FIELDS.includes(row.field_name)) {
    updatePayload[row.field_name] = textareaToArray(row.proposed_value);
  } else {
    updatePayload[row.field_name] = row.proposed_value;
  }

  const { error: characterUpdateError } = await supabase
    .from("characters")
    .update(updatePayload)
    .eq("id", row.character_id);

  if (characterUpdateError) throw new Error(characterUpdateError.message);

  const { error: approveError } = await supabase
    .from("character_field_submissions")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: args.approvedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  if (approveError) throw new Error(approveError.message);
}

export async function rejectSubmission(args: {
  submissionId: string;
  approvedBy: string;
}) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("character_field_submissions")
    .update({
      status: "rejected",
      approved_by: args.approvedBy,
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.submissionId);

  if (error) throw new Error(error.message);
}