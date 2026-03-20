import { createAdminClient } from "@/lib/supabase/admin";

export const EVENT_CONTRIBUTABLE_FIELDS = [
  "title",
  "slug",
  "order",
  "importance",
  "details",
  "involved_characters",
] as const;

export type EventContributableField =
  (typeof EVENT_CONTRIBUTABLE_FIELDS)[number];

export type EventContributionRow = {
  id: string;
  slug: string;
  title: string;
  order: number | null;
  importance: number | null;
  details: string | null;
  involved_characters: string[] | null;
};

export type EventSubmissionRow = {
  id: string;
  event_id: string;
  field_name: EventContributableField;
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

export type AdminEventSubmissionRow = EventSubmissionRow & {
  event: { id: string; title: string; slug: string } | null;
};

export type EventStub = {
  id: string;
  slug: string;
  title: string;
  order: number;
  importance: number;
};

export type CharacterStub = {
  key: string;
  name: string;
  avatar: string | null;
};

export function formatEventFieldValue(
  event: EventContributionRow,
  field: EventContributableField
): string {
  switch (field) {
    case "title":
      return event.title ?? "";
    case "slug":
      return event.slug ?? "";
    case "order":
      return event.order != null ? String(event.order) : "";
    case "importance":
      return event.importance != null ? String(event.importance) : "";
    case "details":
      return event.details ?? "";
    case "involved_characters":
      return Array.isArray(event.involved_characters)
        ? event.involved_characters.join("\n")
        : "";
    default:
      return "";
  }
}

export async function getEventBySlugForContribution(
  slug: string
): Promise<EventContributionRow | null> {
  const safeSlug = String(slug ?? "").trim().toLowerCase();
  if (!safeSlug) return null;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("game_events")
    .select(`
      id,
      slug,
      title,
      "order",
      importance,
      details,
      involved_characters
    `)
    .eq("slug", safeSlug)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data as EventContributionRow | null) ?? null;
}

export async function listSubmissionsForEvent(
  eventId: string
): Promise<EventSubmissionRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("event_field_submissions")
    .select("*")
    .eq("event_id", eventId)
    .order("upvotes", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as EventSubmissionRow[];
}

export async function listAllEvents(): Promise<EventStub[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("game_events")
    .select(`id, slug, title, "order", importance`)
    .order("order", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((e: any) => ({
    id: e.id,
    slug: e.slug,
    title: e.title,
    order: e.order ?? 0,
    importance: e.importance ?? 1,
  }));
}

export async function listAllCharacters(): Promise<CharacterStub[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("characters")
    .select("key, name, avatar")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((c: any) => ({
    key: c.key,
    name: c.name,
    avatar: c.avatar ?? null,
  }));
}

export async function createEventFieldSubmission(args: {
  eventId: string;
  fieldName: EventContributableField;
  currentValue: string;
  proposedValue: string;
  reason?: string;
  submittedByName?: string;
}) {
  const supabase = createAdminClient();

  const { error } = await supabase.from("event_field_submissions").insert({
    event_id: args.eventId,
    field_name: args.fieldName,
    current_value: args.currentValue || null,
    proposed_value: args.proposedValue,
    reason: args.reason?.trim() || null,
    submitted_by_name: args.submittedByName?.trim() || null,
  });

  if (error) throw new Error(error.message);
}

export async function listPendingEventSubmissions(): Promise<
  AdminEventSubmissionRow[]
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("event_field_submissions")
    .select("*, event:game_events(id,title,slug)")
    .eq("status", "pending")
    .order("upvotes", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    event: Array.isArray(row.event) ? row.event[0] ?? null : row.event,
  }));
}

export async function listEventSubmissionHistory(): Promise<
  AdminEventSubmissionRow[]
> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("event_field_submissions")
    .select("*, event:game_events(id,title,slug)")
    .neq("status", "pending")
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    event: Array.isArray(row.event) ? row.event[0] ?? null : row.event,
  }));
}

export async function getEventIdForSubmission(
  submissionId: string
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("event_field_submissions")
    .select("event_id")
    .eq("id", submissionId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data?.event_id ?? null;
}

async function normalizeEventOrdersWithInsertedTarget(args: {
  eventId: string;
  requestedOrder: number;
}) {
  const supabase = createAdminClient();
  const { eventId, requestedOrder } = args;

  const { data: events, error: listError } = await supabase
    .from("game_events")
    .select(`id, "order"`)
    .order("order", { ascending: true })
    .order("created_at", { ascending: true });

  if (listError) throw new Error(listError.message);

  const rows = (events ?? []) as Array<{ id: string; order: number | null }>;
  const others = rows.filter((e) => e.id !== eventId);

  const targetIndex = Math.max(
    0,
    Math.min(others.length, Math.floor(requestedOrder) - 1)
  );

  const reordered = [
    ...others.slice(0, targetIndex),
    { id: eventId, order: requestedOrder },
    ...others.slice(targetIndex),
  ];

  for (let i = 0; i < reordered.length; i++) {
    const newOrder = i + 1;
    const row = reordered[i];

    const { error: updateError } = await supabase
      .from("game_events")
      .update({
        order: newOrder,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    if (updateError) throw new Error(updateError.message);
  }
}

export async function approveEventSubmission(args: {
  submissionId: string;
  approvedBy: string;
}) {
  const supabase = createAdminClient();
  const { submissionId, approvedBy } = args;

  const { data: sub, error: fetchError } = await supabase
    .from("event_field_submissions")
    .select("event_id, field_name, proposed_value")
    .eq("id", submissionId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const fieldMap: Record<EventContributableField, string> = {
    title: "title",
    slug: "slug",
    order: "order",
    importance: "importance",
    details: "details",
    involved_characters: "involved_characters",
  };

  const fieldName = sub.field_name as EventContributableField;
  const col = fieldMap[fieldName];
  if (!col) throw new Error("Unsupported event field.");

  if (fieldName === "order") {
    const requestedOrder = Number(sub.proposed_value);
    if (!Number.isFinite(requestedOrder)) {
      throw new Error("Invalid numeric value for order.");
    }

    await normalizeEventOrdersWithInsertedTarget({
      eventId: sub.event_id,
      requestedOrder,
    });
  } else {
    let value: unknown = sub.proposed_value;

    if (fieldName === "importance") {
      const parsed = Number(sub.proposed_value);
      if (!Number.isFinite(parsed)) {
        throw new Error("Invalid numeric value for importance.");
      }
      value = parsed;
    }

    if (fieldName === "involved_characters") {
      value = sub.proposed_value
        .split("\n")
        .map((s: string) => s.trim())
        .filter(Boolean);
    }

    const { error: eventUpdateError } = await supabase
      .from("game_events")
      .update({
        [col]: value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sub.event_id);

    if (eventUpdateError) throw new Error(eventUpdateError.message);
  }

  const { error: updateSubError } = await supabase
    .from("event_field_submissions")
    .update({
      status: "approved",
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", submissionId);

  if (updateSubError) throw new Error(updateSubError.message);
}

export async function rejectEventSubmission(args: {
  submissionId: string;
  approvedBy: string;
}) {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("event_field_submissions")
    .update({
      status: "rejected",
      approved_by: args.approvedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", args.submissionId);

  if (error) throw new Error(error.message);
}

export async function castEventSubmissionVote(args: {
  submissionId: string;
  voterKey: string;
  voteType: "upvote" | "downvote";
}) {
  const supabase = createAdminClient();
  const { submissionId, voterKey, voteType } = args;

  const { data: existingVote, error: existingVoteError } = await supabase
    .from("event_submission_votes")
    .select("*")
    .eq("submission_id", submissionId)
    .eq("voter_key", voterKey)
    .maybeSingle();

  if (existingVoteError) throw new Error(existingVoteError.message);

  if (!existingVote) {
    const { error: insertVoteError } = await supabase
      .from("event_submission_votes")
      .insert({
        submission_id: submissionId,
        voter_key: voterKey,
        vote_type: voteType,
      });

    if (insertVoteError) throw new Error(insertVoteError.message);

    const counterField = voteType === "upvote" ? "upvotes" : "downvotes";

    const { data: currentSubmission, error: currentSubmissionError } =
      await supabase
        .from("event_field_submissions")
        .select("upvotes, downvotes")
        .eq("id", submissionId)
        .single();

    if (currentSubmissionError) throw new Error(currentSubmissionError.message);

    const { error: updateSubmissionError } = await supabase
      .from("event_field_submissions")
      .update({
        [counterField]: (currentSubmission as any)[counterField] + 1,
      })
      .eq("id", submissionId);

    if (updateSubmissionError) throw new Error(updateSubmissionError.message);
    return;
  }

  if (existingVote.vote_type === voteType) return;

  const { error: updateVoteError } = await supabase
    .from("event_submission_votes")
    .update({ vote_type: voteType })
    .eq("id", existingVote.id);

  if (updateVoteError) throw new Error(updateVoteError.message);

  const { data: currentSubmission, error: currentSubmissionError } =
    await supabase
      .from("event_field_submissions")
      .select("upvotes, downvotes")
      .eq("id", submissionId)
      .single();

  if (currentSubmissionError) throw new Error(currentSubmissionError.message);

  const upvotes =
    voteType === "upvote"
      ? currentSubmission.upvotes + 1
      : Math.max(0, currentSubmission.upvotes - 1);

  const downvotes =
    voteType === "downvote"
      ? currentSubmission.downvotes + 1
      : Math.max(0, currentSubmission.downvotes - 1);

  const { error: updateSubmissionError } = await supabase
    .from("event_field_submissions")
    .update({ upvotes, downvotes })
    .eq("id", submissionId);

  if (updateSubmissionError) throw new Error(updateSubmissionError.message);
}