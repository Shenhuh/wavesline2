import {
  FIELD_LABELS,
  listPendingSubmissions,
} from "@/lib/character-submissions";
import {
  approveSubmissionAction,
  rejectSubmissionAction,
} from "./actions";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminSubmissionHistoryRow = {
  id: string;
  character_id: string;
  field_name: keyof typeof FIELD_LABELS;
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
  character: {
    id: string;
    name: string;
    key: string;
  } | null;
};

async function listSubmissionHistory(): Promise<AdminSubmissionHistoryRow[]> {
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
    .neq("status", "pending")
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    character: Array.isArray(row.character) ? row.character[0] ?? null : row.character,
  }));
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

function StatusBadge({
  status,
}: {
  status: "pending" | "approved" | "rejected";
}) {
  const className =
    status === "approved"
      ? "bg-green-100 text-green-700"
      : status === "rejected"
      ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>
      {status}
    </span>
  );
}

function SuccessNotice({ done }: { done?: string }) {
  if (done === "approved") {
    return (
      <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        Submission approved.
      </div>
    );
  }

  if (done === "rejected") {
    return (
      <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Submission rejected.
      </div>
    );
  }

  if (done === "missing") {
    return (
      <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        Missing submission id.
      </div>
    );
  }

  return null;
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ done?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const done = params?.done;

  const [pendingSubmissions, historySubmissions] = await Promise.all([
    listPendingSubmissions(),
    listSubmissionHistory(),
  ]);

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#2a313d]">Community Submissions</h1>
        <p className="mt-1 text-sm text-[#677388]">
          Review proposals, approve them into character data, and keep a record of past decisions.
        </p>
      </div>

      <SuccessNotice done={done} />

      <div className="space-y-8">
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#2a313d]">Pending Submissions</h2>
              <p className="mt-1 text-sm text-[#677388]">
                These are still waiting for admin review.
              </p>
            </div>

            <span className="rounded-full bg-[#23252f] px-3 py-1 text-xs font-semibold text-white">
              {pendingSubmissions.length} pending
            </span>
          </div>

          {pendingSubmissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/10 p-4 text-[#677388]">
              No pending submissions.
            </div>
          ) : (
            <div className="space-y-5">
              {pendingSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-2xl border border-black/10 bg-[#fafbfc] p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#23252f] px-3 py-1 text-xs font-semibold text-white">
                      {submission.character?.name ?? "Unknown"}
                    </span>

                    <span className="rounded-full bg-[#e8edf5] px-3 py-1 text-xs font-semibold text-[#2a313d]">
                      {FIELD_LABELS[submission.field_name]}
                    </span>

                    <StatusBadge status="pending" />

                    <span className="text-xs text-[#677388]">
                      by {submission.submitted_by_name || "Anonymous"}
                    </span>

                    <span className="text-xs text-[#677388]">
                      ▲ {submission.upvotes} / ▼ {submission.downvotes}
                    </span>

                    <span className="text-xs text-[#677388]">
                      submitted {formatDate(submission.created_at)}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[#677388]">
                        Current
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3 text-sm whitespace-pre-wrap text-[#23252f]/75">
                        {submission.current_value || "—"}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[#677388]">
                        Proposed
                      </div>
                      <div className="rounded-xl bg-[#eef6ff] px-4 py-3 text-sm whitespace-pre-wrap text-[#23252f]">
                        {submission.proposed_value}
                      </div>
                    </div>
                  </div>

                  {submission.reason ? (
                    <div className="mt-4">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[#677388]">
                        Reason
                      </div>
                      <div className="rounded-xl bg-white px-4 py-3 text-sm whitespace-pre-wrap text-[#23252f]/80">
                        {submission.reason}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 flex gap-3">
                    <form action={approveSubmissionAction}>
                      <input type="hidden" name="submissionId" value={submission.id} />
                      <button
                        type="submit"
                        className="rounded-xl bg-[#23252f] px-4 py-2 font-semibold text-white"
                      >
                        Approve
                      </button>
                    </form>

                    <form action={rejectSubmissionAction}>
                      <input type="hidden" name="submissionId" value={submission.id} />
                      <button
                        type="submit"
                        className="rounded-xl border border-red-300 px-4 py-2 font-semibold text-red-600"
                      >
                        Reject
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-black/10 pt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-[#2a313d]">Submission History</h2>
              <p className="mt-1 text-sm text-[#677388]">
                Previously reviewed submissions, including approved and rejected ones.
              </p>
            </div>

            <span className="rounded-full bg-[#e8edf5] px-3 py-1 text-xs font-semibold text-[#2a313d]">
              {historySubmissions.length} reviewed
            </span>
          </div>

          {historySubmissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-black/10 p-4 text-[#677388]">
              No submission history yet.
            </div>
          ) : (
            <div className="space-y-5">
              {historySubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-2xl border border-black/10 bg-white p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#23252f] px-3 py-1 text-xs font-semibold text-white">
                      {submission.character?.name ?? "Unknown"}
                    </span>

                    <span className="rounded-full bg-[#e8edf5] px-3 py-1 text-xs font-semibold text-[#2a313d]">
                      {FIELD_LABELS[submission.field_name]}
                    </span>

                    <StatusBadge status={submission.status} />

                    <span className="text-xs text-[#677388]">
                      by {submission.submitted_by_name || "Anonymous"}
                    </span>

                    <span className="text-xs text-[#677388]">
                      ▲ {submission.upvotes} / ▼ {submission.downvotes}
                    </span>

                    <span className="text-xs text-[#677388]">
                      reviewed {formatDate(submission.updated_at)}
                    </span>

                    <span className="text-xs text-[#677388]">
                      admin: {submission.approved_by || "—"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[#677388]">
                        Current at time of submission
                      </div>
                      <div className="rounded-xl bg-[#f8fafc] px-4 py-3 text-sm whitespace-pre-wrap text-[#23252f]/75">
                        {submission.current_value || "—"}
                      </div>
                    </div>

                    <div>
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[#677388]">
                        Proposed
                      </div>
                      <div className="rounded-xl bg-[#eef6ff] px-4 py-3 text-sm whitespace-pre-wrap text-[#23252f]">
                        {submission.proposed_value}
                      </div>
                    </div>
                  </div>

                  {submission.reason ? (
                    <div className="mt-4">
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[#677388]">
                        Reason
                      </div>
                      <div className="rounded-xl bg-[#fafafa] px-4 py-3 text-sm whitespace-pre-wrap text-[#23252f]/80">
                        {submission.reason}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}