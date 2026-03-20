import { FIELD_LABELS, listPendingSubmissions } from "@/lib/character-submissions";
import { approveSubmissionAction, rejectSubmissionAction } from "./actions";
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
  character: { id: string; name: string; key: string } | null;
};

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

function fmt(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function StatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending:  { bg: "#fef3c7", color: "#92400e", label: "Pending" },
    approved: { bg: "#d1fae5", color: "#065f46", label: "Approved ✓" },
    rejected: { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
  };
  const s = map[status];
  return (
    <span style={{ display: "inline-block", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams?: Promise<{ done?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const done = params?.done;
  const [pending, history] = await Promise.all([listPendingSubmissions(), listSubmissionHistory()]);

  const card: React.CSSProperties = {
    background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginBottom: 12, overflow: "hidden",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#23252f", margin: 0, letterSpacing: "-0.3px" }}>Community Submissions</h1>
        <p style={{ fontSize: 13, color: "rgba(35,37,47,0.5)", margin: "4px 0 0" }}>Review proposals and approve them into character data.</p>
      </div>

      {/* Notice */}
      {done === "approved" && (
        <div style={{ background: "#d1fae5", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#065f46", marginBottom: 16 }}>✓ Submission approved.</div>
      )}
      {done === "rejected" && (
        <div style={{ background: "#fee2e2", borderRadius: 10, padding: "10px 16px", fontSize: 13, color: "#991b1b", marginBottom: 16 }}>Submission rejected.</div>
      )}

      {/* Pending */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#23252f", margin: 0 }}>Pending Review</h2>
          <span style={{ background: "#23252f", color: "white", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
            {pending.length}
          </span>
        </div>

        {pending.length === 0 ? (
          <div style={{ background: "white", borderRadius: 12, border: "1px dashed rgba(0,0,0,0.1)", padding: 24, textAlign: "center", fontSize: 13, color: "rgba(35,37,47,0.4)" }}>
            No pending submissions. 🎉
          </div>
        ) : (
          pending.map((sub) => (
            <div key={sub.id} style={card}>
              {/* Card header */}
              <div style={{ padding: "12px 16px", background: "#f6f7f9", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, background: "#23252f", color: "white" }}>
                  {sub.character?.name ?? "Unknown"}
                </span>
                <span style={{ display: "inline-block", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, background: "rgba(35,37,47,0.08)", color: "#23252f" }}>
                  {FIELD_LABELS[sub.field_name]}
                </span>
                <StatusPill status="pending" />
                <span style={{ fontSize: 12, color: "rgba(35,37,47,0.45)", marginLeft: 4 }}>
                  by {sub.submitted_by_name || "Anonymous"} · ▲ {sub.upvotes} / ▼ {sub.downvotes} · {fmt(sub.created_at)}
                </span>
              </div>

              {/* Body */}
              <div style={{ padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: sub.reason ? 12 : 0 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(35,37,47,0.4)", marginBottom: 6 }}>Current</div>
                    <div style={{ fontSize: 13, color: "rgba(35,37,47,0.65)", background: "#f6f7f9", borderRadius: 8, padding: "10px 12px", whiteSpace: "pre-wrap", lineHeight: 1.6, minHeight: 40 }}>
                      {sub.current_value || <em style={{ color: "rgba(35,37,47,0.3)" }}>Nothing set</em>}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(35,37,47,0.4)", marginBottom: 6 }}>Proposed</div>
                    <div style={{ fontSize: 13, color: "#23252f", background: "#eef6ff", borderRadius: 8, padding: "10px 12px", whiteSpace: "pre-wrap", lineHeight: 1.6, border: "1px solid rgba(59,130,246,0.1)" }}>
                      {sub.proposed_value}
                    </div>
                  </div>
                </div>

                {sub.reason && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(35,37,47,0.4)", marginBottom: 6 }}>Reason</div>
                    <div style={{ fontSize: 13, color: "rgba(35,37,47,0.7)", background: "#fffbeb", borderRadius: 8, padding: "10px 12px", lineHeight: 1.6, fontStyle: "italic", border: "1px solid rgba(245,158,11,0.15)" }}>
                      "{sub.reason}"
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <form action={approveSubmissionAction}>
                    <input type="hidden" name="submissionId" value={sub.id} />
                    <button type="submit" style={{ borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, color: "white", background: "#23252f", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                      ✓ Approve
                    </button>
                  </form>
                  <form action={rejectSubmissionAction}>
                    <input type="hidden" name="submissionId" value={sub.id} />
                    <button type="submit" style={{ borderRadius: 8, padding: "8px 20px", fontSize: 13, fontWeight: 700, color: "#991b1b", background: "white", border: "1px solid rgba(220,38,38,0.3)", cursor: "pointer", fontFamily: "inherit" }}>
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* History */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#23252f", margin: 0 }}>Review History</h2>
          <span style={{ background: "rgba(35,37,47,0.08)", color: "#23252f", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
            {history.length}
          </span>
        </div>

        {history.length === 0 ? (
          <div style={{ background: "white", borderRadius: 12, border: "1px dashed rgba(0,0,0,0.1)", padding: 24, textAlign: "center", fontSize: 13, color: "rgba(35,37,47,0.4)" }}>
            No history yet.
          </div>
        ) : (
          history.map((sub) => (
            <div key={sub.id} style={card}>
              <div style={{ padding: "12px 16px", background: "#f6f7f9", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, background: "#23252f", color: "white" }}>
                  {sub.character?.name ?? "Unknown"}
                </span>
                <span style={{ display: "inline-block", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700, background: "rgba(35,37,47,0.08)", color: "#23252f" }}>
                  {FIELD_LABELS[sub.field_name]}
                </span>
                <StatusPill status={sub.status} />
                <span style={{ fontSize: 12, color: "rgba(35,37,47,0.45)", marginLeft: 4 }}>
                  by {sub.submitted_by_name || "Anonymous"} · ▲ {sub.upvotes} / ▼ {sub.downvotes} · reviewed {fmt(sub.updated_at)}
                </span>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(35,37,47,0.4)", marginBottom: 6 }}>Was</div>
                    <div style={{ fontSize: 13, color: "rgba(35,37,47,0.55)", background: "#f6f7f9", borderRadius: 8, padding: "10px 12px", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {sub.current_value || "—"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(35,37,47,0.4)", marginBottom: 6 }}>Proposed</div>
                    <div style={{ fontSize: 13, color: "#23252f", background: sub.status === "approved" ? "#f0fdf4" : "#fafafa", borderRadius: 8, padding: "10px 12px", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                      {sub.proposed_value}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}