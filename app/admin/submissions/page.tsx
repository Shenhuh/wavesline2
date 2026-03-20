import { FIELD_LABELS, listPendingSubmissions } from "@/lib/character-submissions";
import {
  listPendingEventSubmissions,
  listEventSubmissionHistory,
  type AdminEventSubmissionRow,
} from "@/lib/event-submissions";
import {
  approveSubmissionAction,
  rejectSubmissionAction,
  approveEventSubmissionAction,
  rejectEventSubmissionAction,
} from "./actions";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Types ─────────────────────────────────────────────────────────────
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
  character: { id: string; name: string; key: string } | null;
};

// ── Data fetcher ──────────────────────────────────────────────────────
async function listSubmissionHistory(): Promise<AdminSubmissionHistoryRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("character_field_submissions")
    .select("*, character:characters(id,name,key)")
    .neq("status", "pending")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((row) => ({
    ...row,
    character: Array.isArray(row.character) ? row.character[0] ?? null : row.character,
  }));
}

// ── Helpers ───────────────────────────────────────────────────────────
function fmt(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function StatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending:  { bg: "rgba(251,191,36,0.12)",  color: "#92400e", border: "rgba(251,191,36,0.3)",  label: "⏳ Pending" },
    approved: { bg: "rgba(52,211,153,0.12)",  color: "#065f46", border: "rgba(52,211,153,0.3)",  label: "✓ Approved" },
    rejected: { bg: "rgba(248,113,113,0.12)", color: "#991b1b", border: "rgba(248,113,113,0.3)", label: "✗ Rejected" },
  };
  const s = map[status];
  return (
    <span style={{ display: "inline-block", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function Tag({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span style={{
      display: "inline-block", borderRadius: 20, padding: "2px 10px",
      fontSize: 11, fontWeight: 700,
      background: dark ? "#23252f" : "rgba(35,37,47,0.08)",
      color: dark ? "white" : "#23252f",
    }}>
      {children}
    </span>
  );
}

// ── Shared card styles ────────────────────────────────────────────────
const card: React.CSSProperties = {
  background: "white", borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.07)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  marginBottom: 12, overflow: "hidden",
};

const actionBtn = (variant: "approve" | "reject"): React.CSSProperties => ({
  borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700,
  border: variant === "approve" ? "none" : "1px solid rgba(220,38,38,0.3)",
  cursor: "pointer", fontFamily: "inherit",
  color: variant === "approve" ? "white" : "#991b1b",
  background: variant === "approve" ? "#23252f" : "white",
});

// ── Page ──────────────────────────────────────────────────────────────
export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ done?: string; tab?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const done = params?.done;
  const tab = params?.tab ?? "characters";

  const [
    pendingChars,
    historyChars,
    pendingEvents,
    historyEvents,
  ] = await Promise.all([
    listPendingSubmissions(),
    listSubmissionHistory(),
    listPendingEventSubmissions(),
    listEventSubmissionHistory(),
  ]);

  const totalPending = pendingChars.length + pendingEvents.length;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#23252f", margin: 0, letterSpacing: "-0.3px" }}>
          Community Submissions
        </h1>
        <p style={{ fontSize: 13, color: "rgba(35,37,47,0.5)", margin: "4px 0 0" }}>
          Review proposals and approve them into character and event data.
        </p>
      </div>

      {/* Toast notices */}
      {done === "approved" && (
        <div style={{ background: "#d1fae5", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#065f46", marginBottom: 16 }}>
          ✓ Submission approved.
        </div>
      )}
      {done === "rejected" && (
        <div style={{ background: "#fee2e2", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#991b1b", marginBottom: 16 }}>
          Submission rejected.
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, background: "white", borderRadius: 12, padding: 4, border: "1px solid rgba(0,0,0,0.07)", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", width: "fit-content" }}>
        {[
          { id: "characters", label: "Characters", count: pendingChars.length },
          { id: "events",     label: "Events",     count: pendingEvents.length },
        ].map((t) => (
          <a key={t.id} href={`?tab=${t.id}`} style={{ textDecoration: "none" }}>
            <div style={{
              padding: "8px 18px", borderRadius: 9, fontSize: 13, fontWeight: 700,
              transition: "all 0.12s",
              background: tab === t.id ? "#23252f" : "transparent",
              color: tab === t.id ? "#fff" : "rgba(35,37,47,0.45)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {t.label}
              {t.count > 0 && (
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  background: tab === t.id ? "rgba(255,255,255,0.2)" : "#ef4444",
                  color: "white", borderRadius: 20, padding: "1px 7px",
                }}>
                  {t.count}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>

      {/* ══ CHARACTERS TAB ══ */}
      {tab === "characters" && (
        <div>
          {/* Pending */}
          <SectionHeader label="Pending Review" count={pendingChars.length} />
          {pendingChars.length === 0 ? (
            <EmptyState message="No pending character submissions. 🎉" />
          ) : (
            pendingChars.map((sub) => (
              <div key={sub.id} style={card}>
                <div style={{ padding: "12px 16px", background: "#f6f7f9", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <Tag dark>{sub.character?.name ?? "Unknown"}</Tag>
                  <Tag>{FIELD_LABELS[sub.field_name]}</Tag>
                  <StatusPill status="pending" />
                  <span style={{ fontSize: 12, color: "rgba(35,37,47,0.45)", marginLeft: 4 }}>
                    by {sub.submitted_by_name || "Anonymous"} · ▲ {sub.upvotes} / ▼ {sub.downvotes} · {fmt(sub.created_at)}
                  </span>
                </div>
                <div style={{ padding: 16 }}>
                  <ValueGrid
                    current={sub.current_value}
                    proposed={sub.proposed_value}
                    reason={sub.reason}
                  />
                  <ActionRow
                    submissionId={sub.id}
                    approveAction={approveSubmissionAction}
                    rejectAction={rejectSubmissionAction}
                  />
                </div>
              </div>
            ))
          )}

          {/* History */}
          <div style={{ marginTop: 32 }}>
            <SectionHeader label="Review History" count={historyChars.length} muted />
            {historyChars.length === 0 ? (
              <EmptyState message="No history yet." />
            ) : (
              historyChars.map((sub) => (
                <div key={sub.id} style={card}>
                  <div style={{ padding: "12px 16px", background: "#f6f7f9", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <Tag dark>{sub.character?.name ?? "Unknown"}</Tag>
                    <Tag>{FIELD_LABELS[sub.field_name]}</Tag>
                    <StatusPill status={sub.status} />
                    <span style={{ fontSize: 12, color: "rgba(35,37,47,0.45)", marginLeft: 4 }}>
                      by {sub.submitted_by_name || "Anonymous"} · ▲ {sub.upvotes} / ▼ {sub.downvotes} · reviewed {fmt(sub.updated_at)}
                    </span>
                  </div>
                  <div style={{ padding: 16 }}>
                    <HistoryGrid was={sub.current_value} proposed={sub.proposed_value} approved={sub.status === "approved"} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ══ EVENTS TAB ══ */}
      {tab === "events" && (
        <div>
          {/* Pending */}
          <SectionHeader label="Pending Review" count={pendingEvents.length} />
          {pendingEvents.length === 0 ? (
            <EmptyState message="No pending event submissions. 🎉" />
          ) : (
            pendingEvents.map((sub) => (
              <div key={sub.id} style={card}>
                <div style={{ padding: "12px 16px", background: "#f6f7f9", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                  <Tag dark>{sub.event?.title ?? "Unknown Event"}</Tag>
                  <Tag>{sub.field_name}</Tag>
                  <StatusPill status="pending" />
                  <span style={{ fontSize: 12, color: "rgba(35,37,47,0.45)", marginLeft: 4 }}>
                    by {sub.submitted_by_name || "Anonymous"} · ▲ {sub.upvotes} / ▼ {sub.downvotes} · {fmt(sub.created_at)}
                  </span>
                </div>
                <div style={{ padding: 16 }}>
                  <ValueGrid
                    current={sub.current_value}
                    proposed={sub.proposed_value}
                    reason={sub.reason}
                  />
                  <ActionRow
                    submissionId={sub.id}
                    approveAction={approveEventSubmissionAction}
                    rejectAction={rejectEventSubmissionAction}
                  />
                </div>
              </div>
            ))
          )}

          {/* History */}
          <div style={{ marginTop: 32 }}>
            <SectionHeader label="Review History" count={historyEvents.length} muted />
            {historyEvents.length === 0 ? (
              <EmptyState message="No history yet." />
            ) : (
              historyEvents.map((sub) => (
                <div key={sub.id} style={card}>
                  <div style={{ padding: "12px 16px", background: "#f6f7f9", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <Tag dark>{sub.event?.title ?? "Unknown Event"}</Tag>
                    <Tag>{sub.field_name}</Tag>
                    <StatusPill status={sub.status} />
                    <span style={{ fontSize: 12, color: "rgba(35,37,47,0.45)", marginLeft: 4 }}>
                      by {sub.submitted_by_name || "Anonymous"} · ▲ {sub.upvotes} / ▼ {sub.downvotes} · reviewed {fmt(sub.updated_at)}
                    </span>
                  </div>
                  <div style={{ padding: 16 }}>
                    <HistoryGrid was={sub.current_value} proposed={sub.proposed_value} approved={sub.status === "approved"} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────

function SectionHeader({ label, count, muted }: { label: string; count: number; muted?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: "#23252f", margin: 0 }}>{label}</h2>
      <span style={{
        background: muted ? "rgba(35,37,47,0.08)" : "#23252f",
        color: muted ? "#23252f" : "white",
        borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700,
      }}>
        {count}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ background: "white", borderRadius: 12, border: "1px dashed rgba(0,0,0,0.1)", padding: 24, textAlign: "center", fontSize: 13, color: "rgba(35,37,47,0.4)", marginBottom: 12 }}>
      {message}
    </div>
  );
}

function ValueGrid({ current, proposed, reason }: { current: string | null; proposed: string; reason: string | null }) {
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: reason ? 12 : 0 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(35,37,47,0.4)", marginBottom: 6 }}>Current</div>
          <div style={{ fontSize: 13, color: "rgba(35,37,47,0.65)", background: "#f6f7f9", borderRadius: 8, padding: "10px 12px", whiteSpace: "pre-wrap", lineHeight: 1.6, minHeight: 40 }}>
            {current || <em style={{ color: "rgba(35,37,47,0.3)" }}>Nothing set</em>}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(35,37,47,0.4)", marginBottom: 6 }}>Proposed</div>
          <div style={{ fontSize: 13, color: "#23252f", background: "#eef6ff", borderRadius: 8, padding: "10px 12px", whiteSpace: "pre-wrap", lineHeight: 1.6, border: "1px solid rgba(59,130,246,0.1)" }}>
            {proposed}
          </div>
        </div>
      </div>
      {reason && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(35,37,47,0.4)", marginBottom: 6 }}>Reason</div>
          <div style={{ fontSize: 13, color: "rgba(35,37,47,0.7)", background: "#fffbeb", borderRadius: 8, padding: "10px 12px", lineHeight: 1.6, fontStyle: "italic", border: "1px solid rgba(245,158,11,0.15)" }}>
            "{reason}"
          </div>
        </div>
      )}
    </>
  );
}

function HistoryGrid({ was, proposed, approved }: { was: string | null; proposed: string; approved: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(35,37,47,0.4)", marginBottom: 6 }}>Was</div>
        <div style={{ fontSize: 13, color: "rgba(35,37,47,0.55)", background: "#f6f7f9", borderRadius: 8, padding: "10px 12px", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
          {was || "—"}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(35,37,47,0.4)", marginBottom: 6 }}>Proposed</div>
        <div style={{ fontSize: 13, color: "#23252f", background: approved ? "#f0fdf4" : "#fafafa", borderRadius: 8, padding: "10px 12px", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
          {proposed}
        </div>
      </div>
    </div>
  );
}

function ActionRow({ submissionId, approveAction, rejectAction }: {
  submissionId: string;
  approveAction: (formData: FormData) => Promise<void>;
  rejectAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
      <form action={approveAction}>
        <input type="hidden" name="submissionId" value={submissionId} />
        <button type="submit" style={actionBtn("approve")}>✓ Approve</button>
      </form>
      <form action={rejectAction}>
        <input type="hidden" name="submissionId" value={submissionId} />
        <button type="submit" style={actionBtn("reject")}>Reject</button>
      </form>
    </div>
  );
}