"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type {
  ContributableField,
  SubmissionRow,
} from "@/lib/character-submissions";

const FIELD_OPTIONS: Array<{ value: ContributableField; label: string; desc: string; icon: string }> = [
  { value: "title",                 label: "Title",                 icon: "🏷️", desc: "Role or label shown under their name" },
  { value: "starter_message",       label: "Starter Message",       icon: "💬", desc: "What they say when a chat begins" },
  { value: "style_notes",           label: "Style Notes",           icon: "✍️", desc: "Tone, rhythm, attitude" },
  { value: "likes",                 label: "Likes",                 icon: "💙", desc: "Things they enjoy" },
  { value: "dislikes",              label: "Dislikes",              icon: "🚫", desc: "Things they dislike" },
  { value: "identity_notes",        label: "Identity Notes",        icon: "🪪", desc: "Core facts about who they are" },
  { value: "conversation_rules",    label: "Conversation Rules",    icon: "📜", desc: "How they behave in chat" },
  { value: "relationship_behavior", label: "Relationship Behavior", icon: "🤝", desc: "How they treat people over time" },
  { value: "lore_context",          label: "Lore Context",          icon: "📖", desc: "World facts that ground them" },
  { value: "hard_constraints",      label: "Hard Constraints",      icon: "⛔", desc: "Rules the character must never break" },
  { value: "block_message",         label: "Block Message",         icon: "🔒", desc: "What they say when blocking someone" },
];

const FIELD_GUIDE: Record<ContributableField, { tip: string; sample: string }> = {
  title:                 { tip: "Short and lore-accurate — think of it like a job title on a name card.", sample: "Former Fractsidus Overseer" },
  starter_message:       { tip: "One line, fully in-character. What do they say the moment a chat opens?", sample: "If you're here to waste my time, be honest about it." },
  style_notes:           { tip: "One rule per line. Focus on tone and phrasing, not lore facts.", sample: "Speaks with controlled arrogance.\nPrefers sharp wording over long explanations." },
  likes:                 { tip: "One item per line. Only things confirmed in the game.", sample: "Competence\nBeautiful performances\nPeople who speak directly" },
  dislikes:              { tip: "One item per line. Lore-backed only.", sample: "Incompetence\nEmpty flattery\nBeing underestimated" },
  identity_notes:        { tip: "Brief, factual background the chatbot should always remember.", sample: "Carries herself with confidence and theatrical poise. Tied to the Fractsidus." },
  conversation_rules:    { tip: "Rules for how they respond in chat. One rule per line.", sample: "Do not become overly friendly too quickly.\nChallenge weak wording." },
  relationship_behavior: { tip: "How do they warm up (or not) over time? Do they test people first?", sample: "Often tests people before trusting them. Respect earns better treatment." },
  lore_context:          { tip: "Only lore that changes how the chatbot should behave. Keep it short.", sample: "Associated with the Fractsidus. Speech should feel deliberate and unsettling." },
  hard_constraints:      { tip: "The absolute NEVER rules. Keep them short and strong.", sample: "Do not speak out of character.\nDo not call yourself an AI." },
  block_message:         { tip: "Short and final. Sounds like the character slamming a door.", sample: "Enough. This conversation ends here." },
};

function StatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  const map = {
    pending:  { bg: "rgba(251,191,36,0.12)",  color: "#fbbf24", border: "rgba(251,191,36,0.25)", label: "⏳ Pending" },
    approved: { bg: "rgba(52,211,153,0.12)",  color: "#34d399", border: "rgba(52,211,153,0.25)", label: "✓ Approved" },
    rejected: { bg: "rgba(248,113,113,0.12)", color: "#f87171", border: "rgba(248,113,113,0.25)", label: "✗ Rejected" },
  };
  const s = map[status];
  return (
    <span style={{ borderRadius: 20, padding: "2px 9px", fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

export default function ContributionClient({
  characterKey,
  submissions,
  currentFieldValues,
}: {
  characterKey: string;
  submissions: SubmissionRow[];
  currentFieldValues: Record<string, string>;
}) {
  const router = useRouter();
  const [fieldName, setFieldName]           = useState<ContributableField>("title");
  const [submittedByName, setSubmittedByName] = useState("");
  const [reason, setReason]                 = useState("");
  const [proposedValue, setProposedValue]   = useState("");
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [submitSuccess, setSubmitSuccess]   = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [activeTab, setActiveTab]           = useState<"submit" | "vote">("submit");
  const [guideOpen, setGuideOpen]           = useState(false);

  const guide        = FIELD_GUIDE[fieldName];
  const selectedOpt  = FIELD_OPTIONS.find((f) => f.value === fieldName)!;
  const currentValue = currentFieldValues[fieldName] || "";

  const submissionsByField = useMemo(() => {
    const groups: Record<string, SubmissionRow[]> = {};
    for (const s of submissions) {
      if (!groups[s.field_name]) groups[s.field_name] = [];
      groups[s.field_name].push(s);
    }
    for (const key of Object.keys(groups)) groups[key].sort((a, b) => b.upvotes - a.upvotes);
    return groups;
  }, [submissions]);

  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  async function submitProposal() {
    if (!proposedValue.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res  = await fetch("/api/contributions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterKey, fieldName, proposedValue, reason, submittedByName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data?.error || "Failed to submit."); return; }
      setSubmittedByName(""); setReason(""); setProposedValue("");
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
      router.refresh();
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function vote(submissionId: string, direction: "upvote" | "downvote") {
    await fetch("/api/contributions/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submissionId, direction }),
    });
    router.refresh();
  }

  // ── style tokens ─────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.07)",
    marginBottom: 14,
    overflow: "hidden",
  };

  const inp: React.CSSProperties = {
    width: "100%", boxSizing: "border-box",
    borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
    padding: "10px 13px", fontSize: 13, color: "#e2e8f0",
    background: "rgba(0,0,0,0.3)", outline: "none",
    fontFamily: "inherit", lineHeight: 1.6, resize: "vertical" as const,
  };

  const label: React.CSSProperties = {
    display: "block", fontSize: 11, fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.07em",
    color: "rgba(148,163,184,0.55)", marginBottom: 6,
  };

  return (
    <div>
      {/* ── TAB BAR ── */}
      <div style={{
        display: "flex", gap: 3,
        background: "rgba(0,0,0,0.35)", borderRadius: 12, padding: 3,
        border: "1px solid rgba(255,255,255,0.07)", marginBottom: 18,
      }}>
        {[
          { id: "submit", label: "✏️  Submit" },
          { id: "vote",   label: `🗳️  Vote${pendingCount > 0 ? `  ·  ${pendingCount}` : ""}` },
        ].map((tab) => (
          <button key={tab.id} type="button"
            onClick={() => setActiveTab(tab.id as "submit" | "vote")}
            style={{
              flex: 1, padding: "9px 12px", fontSize: 13, fontWeight: 700,
              border: "none", borderRadius: 9, cursor: "pointer", fontFamily: "inherit",
              transition: "all 0.15s",
              background: activeTab === tab.id ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "transparent",
              color: activeTab === tab.id ? "#fff" : "rgba(148,163,184,0.45)",
              boxShadow: activeTab === tab.id ? "0 2px 10px rgba(99,102,241,0.3)" : "none",
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════
          SUBMIT TAB
      ══════════════════════════════════ */}
      {activeTab === "submit" && (
        <div>

          {/* Step 1 — pick field */}
          <div style={card}>
            <div style={{ padding: "13px 18px 11px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(99,102,241,0.8)", marginBottom: 2 }}>Step 1</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>Which part are you improving?</div>
            </div>
            <div style={{ padding: "14px 18px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 7 }}>
                {FIELD_OPTIONS.map((opt) => {
                  const active = fieldName === opt.value;
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => { setFieldName(opt.value); setProposedValue(""); setGuideOpen(false); }}
                      style={{
                        textAlign: "left", padding: "9px 12px", borderRadius: 9, cursor: "pointer",
                        fontFamily: "inherit", transition: "all 0.12s",
                        border: active ? "1px solid rgba(99,102,241,0.5)" : "1px solid rgba(255,255,255,0.07)",
                        background: active ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.02)",
                      }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: active ? "#c7d2fe" : "rgba(226,232,240,0.7)" }}>
                        {opt.icon} {opt.label}
                      </div>
                      <div style={{ fontSize: 11, color: active ? "rgba(199,210,254,0.5)" : "rgba(148,163,184,0.35)", marginTop: 2, lineHeight: 1.4 }}>
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Step 2 — write proposal */}
          <div style={card}>
            <div style={{ padding: "13px 18px 11px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(99,102,241,0.8)", marginBottom: 2 }}>Step 2</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>
                  Write your proposal for <span style={{ color: "#93c5fd" }}>{selectedOpt.label}</span>
                </div>
              </div>
              {/* Guide toggle */}
              <button type="button" onClick={() => setGuideOpen((o) => !o)}
                style={{
                  flexShrink: 0, fontSize: 11, fontWeight: 700, padding: "5px 11px", borderRadius: 8,
                  border: "1px solid rgba(255,255,255,0.1)", background: guideOpen ? "rgba(99,102,241,0.15)" : "transparent",
                  color: guideOpen ? "#c7d2fe" : "rgba(148,163,184,0.5)", cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}>
                {guideOpen ? "Hide guide ↑" : "What goes here? ↓"}
              </button>
            </div>

            {/* Collapsible guide */}
            {guideOpen && (
              <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.15)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(148,163,184,0.4)", marginBottom: 7 }}>💡 Tip</div>
                    <div style={{ fontSize: 12, color: "rgba(226,232,240,0.6)", lineHeight: 1.7, background: "rgba(99,102,241,0.07)", borderRadius: 9, padding: "10px 13px", border: "1px solid rgba(99,102,241,0.12)" }}>
                      {guide.tip}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(148,163,184,0.4)", marginBottom: 7 }}>📝 Example format</div>
                    <div style={{ fontSize: 12, color: "#93c5fd", whiteSpace: "pre-wrap", lineHeight: 1.7, background: "rgba(37,99,235,0.07)", borderRadius: 9, padding: "10px 13px", border: "1px solid rgba(96,165,250,0.15)" }}>
                      {guide.sample}
                    </div>
                    {currentValue && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(148,163,184,0.4)", marginTop: 12, marginBottom: 7 }}>🔴 Current live value</div>
                        <div style={{ fontSize: 12, color: "rgba(226,232,240,0.5)", whiteSpace: "pre-wrap", lineHeight: 1.7, background: "rgba(0,0,0,0.2)", borderRadius: 9, padding: "10px 13px", border: "1px solid rgba(255,255,255,0.06)" }}>
                          {currentValue}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div style={{ padding: "16px 18px" }}>
              <div style={{ marginBottom: 14 }}>
                <label style={label}>Your proposed {selectedOpt.label}</label>
                <textarea value={proposedValue} onChange={(e) => setProposedValue(e.target.value)}
                  rows={5} style={inp}
                  placeholder={`Write the ${selectedOpt.label.toLowerCase()} here…`} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div>
                  <label style={label}>Source / reason <span style={{ fontWeight: 400, textTransform: "none", opacity: 0.5 }}>(optional)</span></label>
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                    rows={2} style={inp} placeholder='e.g. "In Chapter 2 she is called…"' />
                </div>
                <div>
                  <label style={label}>Your name <span style={{ fontWeight: 400, textTransform: "none", opacity: 0.5 }}>(optional)</span></label>
                  <input value={submittedByName} onChange={(e) => setSubmittedByName(e.target.value)}
                    style={inp} placeholder="Anonymous" />
                </div>
              </div>

              {error && (
                <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 9, padding: "10px 13px", fontSize: 12, color: "#fca5a5", marginBottom: 12 }}>
                  ⚠️ {error}
                </div>
              )}
              {submitSuccess && (
                <div style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 9, padding: "10px 13px", fontSize: 12, color: "#6ee7b7", marginBottom: 12 }}>
                  ✅ Submitted! Switch to the Vote tab to see it.
                </div>
              )}

              <button type="button" onClick={() => void submitProposal()}
                disabled={isSubmitting || !proposedValue.trim()}
                style={{
                  borderRadius: 9, padding: "10px 24px", fontSize: 13, fontWeight: 700,
                  border: "none", fontFamily: "inherit", cursor: proposedValue.trim() ? "pointer" : "not-allowed",
                  background: proposedValue.trim() ? "linear-gradient(135deg,#2563eb,#7c3aed)" : "rgba(255,255,255,0.06)",
                  color: proposedValue.trim() ? "#fff" : "rgba(255,255,255,0.2)",
                  boxShadow: proposedValue.trim() ? "0 3px 12px rgba(99,102,241,0.35)" : "none",
                  transition: "all 0.15s",
                }}>
                {isSubmitting ? "Submitting…" : "Submit proposal →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════
          VOTE TAB
      ══════════════════════════════════ */}
      {activeTab === "vote" && (
        <div>
          {submissions.length === 0 ? (
            <div style={{ ...card, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🌊</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>No proposals yet</div>
              <div style={{ fontSize: 13, color: "rgba(148,163,184,0.5)", marginBottom: 18 }}>
                Be the first to contribute.
              </div>
              <button type="button" onClick={() => setActiveTab("submit")}
                style={{ padding: "9px 22px", borderRadius: 9, background: "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                ✏️ Submit a proposal
              </button>
            </div>
          ) : (
            <>
              {/* Compact voting tip */}
              <div style={{ fontSize: 12, color: "rgba(148,163,184,0.45)", marginBottom: 14, padding: "0 2px" }}>
                Vote <strong style={{ color: "rgba(148,163,184,0.7)" }}>▲ Yes</strong> if the proposal is lore-accurate. Vote <strong style={{ color: "rgba(148,163,184,0.7)" }}>▼ No</strong> if it's wrong or vague. Highest-voted gets approved.
              </div>

              {Object.entries(submissionsByField).map(([field, fieldSubs]) => {
                const opt      = FIELD_OPTIONS.find((f) => f.value === field);
                const pending  = fieldSubs.filter((s) => s.status === "pending");
                const reviewed = fieldSubs.filter((s) => s.status !== "pending");

                return (
                  <div key={field} style={card}>
                    {/* Field header */}
                    <div style={{ padding: "12px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>
                        {opt?.icon} {opt?.label ?? field}
                        <span style={{ fontSize: 11, color: "rgba(148,163,184,0.4)", fontWeight: 400, marginLeft: 8 }}>{opt?.desc}</span>
                      </div>
                      {pending.length > 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.25)", borderRadius: 20, padding: "2px 9px" }}>
                          {pending.length} awaiting votes
                        </span>
                      )}
                    </div>

                    {/* Pending */}
                    {pending.length > 0 && (
                      <div style={{ padding: "14px 18px" }}>
                        {pending.length > 1 && (
                          <div style={{ fontSize: 12, color: "rgba(148,163,184,0.45)", marginBottom: 12 }}>
                            {pending.length} proposals — vote on the most accurate one:
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {pending.map((sub, i) => (
                            <div key={sub.id} style={{
                              borderRadius: 11, overflow: "hidden",
                              border: i === 0 && pending.length > 1 ? "1px solid rgba(52,211,153,0.2)" : "1px solid rgba(255,255,255,0.07)",
                              background: i === 0 && pending.length > 1 ? "rgba(52,211,153,0.04)" : "rgba(0,0,0,0.15)",
                            }}>
                              <div style={{ padding: "8px 13px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                {i === 0 && pending.length > 1 && (
                                  <span style={{ fontSize: 11, fontWeight: 700, background: "rgba(52,211,153,0.12)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)", borderRadius: 20, padding: "2px 8px" }}>
                                    🏆 Top voted
                                  </span>
                                )}
                                <span style={{ fontSize: 11, color: "rgba(148,163,184,0.4)" }}>by {sub.submitted_by_name || "Anonymous"}</span>
                                <StatusPill status={sub.status} />
                              </div>

                              <div style={{ padding: "12px 13px", whiteSpace: "pre-wrap", fontSize: 13, color: "#e2e8f0", lineHeight: 1.75 }}>
                                {sub.proposed_value}
                              </div>

                              {sub.reason && (
                                <div style={{ padding: "0 13px 12px" }}>
                                  <div style={{ fontSize: 11, fontStyle: "italic", color: "rgba(148,163,184,0.45)", background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "8px 11px", border: "1px solid rgba(255,255,255,0.05)" }}>
                                    "{sub.reason}"
                                  </div>
                                </div>
                              )}

                              <div style={{ padding: "10px 13px", borderTop: "1px solid rgba(255,255,255,0.05)", background: "rgba(0,0,0,0.1)", display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 11, color: "rgba(148,163,184,0.35)", marginRight: 2 }}>Accurate?</span>
                                <button type="button" onClick={() => void vote(sub.id, "upvote")} style={{
                                  display: "flex", alignItems: "center", gap: 5,
                                  border: "none", borderRadius: 7, padding: "6px 15px",
                                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                                  background: "linear-gradient(135deg,#2563eb,#7c3aed)", color: "white",
                                  fontFamily: "inherit", boxShadow: "0 2px 8px rgba(99,102,241,0.25)",
                                }}>▲ Yes — {sub.upvotes}</button>
                                <button type="button" onClick={() => void vote(sub.id, "downvote")} style={{
                                  display: "flex", alignItems: "center", gap: 5,
                                  border: "1px solid rgba(255,255,255,0.09)", borderRadius: 7, padding: "6px 15px",
                                  fontSize: 12, fontWeight: 700, cursor: "pointer",
                                  background: "rgba(255,255,255,0.04)", color: "rgba(148,163,184,0.55)",
                                  fontFamily: "inherit",
                                }}>▼ No — {sub.downvotes}</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reviewed */}
                    {reviewed.length > 0 && (
                      <div style={{ padding: "10px 18px 14px", borderTop: pending.length > 0 ? "1px solid rgba(255,255,255,0.05)" : undefined, background: "rgba(0,0,0,0.1)" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(148,163,184,0.3)", marginBottom: 8 }}>Previously reviewed</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                          {reviewed.map((sub) => (
                            <div key={sub.id} style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: "9px 11px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                              <StatusPill status={sub.status} />
                              <div style={{ flex: 1, fontSize: 12, color: "rgba(226,232,240,0.5)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{sub.proposed_value}</div>
                              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.3)", flexShrink: 0 }}>▲{sub.upvotes} ▼{sub.downvotes}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}