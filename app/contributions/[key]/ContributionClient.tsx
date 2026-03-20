"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type {
  ContributableField,
  SubmissionRow,
} from "@/lib/character-submissions";

const FIELD_OPTIONS: Array<{ value: ContributableField; label: string; desc: string }> = [
  { value: "title", label: "Title", desc: "Their role or label shown under their name" },
  { value: "starter_message", label: "Starter Message", desc: "What they say when a conversation begins" },
  { value: "style_notes", label: "Style Notes", desc: "How they talk — tone, rhythm, attitude" },
  { value: "likes", label: "Likes", desc: "Things, topics, or qualities they enjoy" },
  { value: "dislikes", label: "Dislikes", desc: "Things, attitudes, or behaviors they dislike" },
  { value: "identity_notes", label: "Identity Notes", desc: "Core facts about who they are" },
  { value: "conversation_rules", label: "Conversation Rules", desc: "How they behave in chat" },
  { value: "relationship_behavior", label: "Relationship Behavior", desc: "How they treat people over time" },
  { value: "lore_context", label: "Lore Context", desc: "World and lore facts that ground them" },
  { value: "hard_constraints", label: "Hard Constraints", desc: "Rules the character must never break" },
  { value: "block_message", label: "Block Message", desc: "What they say when they block someone" },
];

const FIELD_GUIDE: Record<ContributableField, { whatItIs: string; howToWrite: string[]; sample: string }> = {
  title: {
    whatItIs: "The short label shown under the character's name. Describes their role or position.",
    howToWrite: ["Keep it short — a few words at most", "Use lore-fitting wording", "Don't turn it into a biography"],
    sample: "Hecate / Former Fractsidus Overseer",
  },
  starter_message: {
    whatItIs: "The opening line they say when a conversation starts.",
    howToWrite: ["Write only one opening message", "Keep it in-character", "Don't explain the character out of role"],
    sample: "If you're here to waste my time, be honest about it. I prefer boredom named directly.",
  },
  style_notes: {
    whatItIs: "Short writing-style instructions that shape how the character sounds.",
    howToWrite: ["One point per line", "Focus on tone, phrasing, and attitude", "Don't use this for raw lore facts"],
    sample: "Speaks with controlled arrogance.\nOften sounds theatrical but precise.\nPrefers sharp wording over long explanations.",
  },
  likes: {
    whatItIs: "Things, topics, or qualities the character tends to like.",
    howToWrite: ["One item per line", "Keep entries specific", "Make them useful for conversation behavior"],
    sample: "Competence\nBeautiful performances\nControl\nPeople who speak directly",
  },
  dislikes: {
    whatItIs: "Things, attitudes, or behaviors the character tends to dislike.",
    howToWrite: ["One item per line", "Keep entries specific", "Avoid joke answers unless they truly fit"],
    sample: "Incompetence\nHesitation\nEmpty flattery\nBeing underestimated",
  },
  identity_notes: {
    whatItIs: "Core identity facts the chatbot should remember about who this character is.",
    howToWrite: ["Write important identity and background points", "Keep it factual and useful", "Don't paste unrelated full lore"],
    sample: "Carries herself with confidence and theatrical poise. Tied to the Fractsidus. Used to control, performance, and manipulation.",
  },
  conversation_rules: {
    whatItIs: "Practical rules for how the character should answer in chat.",
    howToWrite: ["Write clear behavioral rules", "Keep them short and direct", "Focus on how the character responds"],
    sample: "Do not become overly friendly too quickly.\nChallenge weak wording.\nStay in-character and avoid meta explanations.",
  },
  relationship_behavior: {
    whatItIs: "How the character treats people as trust, familiarity, or tension changes.",
    howToWrite: ["Describe how they test, trust, warm up, or distance themselves", "Focus on interpersonal behavior"],
    sample: "Often tests people before trusting them. May provoke or speak indirectly at first. Respect and consistency earn better treatment.",
  },
  lore_context: {
    whatItIs: "Important lore and world context that helps keep the character grounded.",
    howToWrite: ["Include only relevant lore tied to the character", "Keep it focused and readable", "Don't dump huge unrelated text"],
    sample: "Associated with the Fractsidus. Carries a dramatic, performance-like presence. Speech should feel deliberate, confident, and unsettling.",
  },
  hard_constraints: {
    whatItIs: "Strict rules the chatbot should never break.",
    howToWrite: ["Use this only for important boundaries", "Write clear do-not rules", "Keep them strong and practical"],
    sample: "Do not speak out of character.\nDo not call yourself an AI.\nDo not become affectionate without enough relationship buildup.",
  },
  block_message: {
    whatItIs: "The message shown when the character blocks the user.",
    howToWrite: ["Keep it short", "Make it final", "It should sound like the character"],
    sample: "Enough. This conversation ends here.",
  },
};

function StatusPill({ status }: { status: "pending" | "approved" | "rejected" }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    pending:  { bg: "#fef3c7", color: "#92400e", label: "Pending review" },
    approved: { bg: "#d1fae5", color: "#065f46", label: "Approved ✓" },
    rejected: { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
  };
  const s = styles[status];
  return (
    <span style={{ display: "inline-block", borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 600, background: s.bg, color: s.color }}>
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
  const [fieldName, setFieldName] = useState<ContributableField>("title");
  const [submittedByName, setSubmittedByName] = useState("");
  const [reason, setReason] = useState("");
  const [proposedValue, setProposedValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"submit" | "vote">("submit");

  const guide = useMemo(() => FIELD_GUIDE[fieldName], [fieldName]);
  const selectedLabel = FIELD_OPTIONS.find((f) => f.value === fieldName)?.label ?? fieldName;
  const currentValue = currentFieldValues[fieldName] || "";

  // Group submissions by field
  const submissionsByField = useMemo(() => {
    const groups: Record<string, SubmissionRow[]> = {};
    for (const s of submissions) {
      if (!groups[s.field_name]) groups[s.field_name] = [];
      groups[s.field_name].push(s);
    }
    // Sort each group by upvotes desc
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => b.upvotes - a.upvotes);
    }
    return groups;
  }, [submissions]);

  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  async function submitProposal() {
    if (!proposedValue.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/contributions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterKey, fieldName, proposedValue, reason, submittedByName }),
      });
      const data = await response.json();
      if (!response.ok) { setError(data?.error || "Failed to submit."); return; }
      setSubmittedByName("");
      setReason("");
      setProposedValue("");
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
      router.refresh();
    } catch {
      setError("Failed to submit.");
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

  const cardStyle: React.CSSProperties = {
    background: "white",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.07)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    marginBottom: 16,
    overflow: "hidden",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 9,
    border: "1px solid rgba(0,0,0,0.12)",
    padding: "10px 14px",
    fontSize: 13,
    color: "#23252f",
    background: "#fafafa",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div>

      {/* ── TAB SWITCHER ── */}
      <div style={{ display: "flex", gap: 4, background: "white", borderRadius: 12, padding: 4, border: "1px solid rgba(0,0,0,0.07)", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        {[
          { id: "submit", label: "✏️  Submit a proposal" },
          { id: "vote", label: `🗳️  Vote on proposals${pendingCount > 0 ? `  (${pendingCount})` : ""}` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as "submit" | "vote")}
            style={{
              flex: 1,
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: 600,
              border: "none",
              borderRadius: 9,
              cursor: "pointer",
              transition: "background 0.15s, color 0.15s",
              background: activeTab === tab.id ? "#23252f" : "transparent",
              color: activeTab === tab.id ? "#ffffff" : "rgba(35,37,47,0.45)",
              fontFamily: "inherit",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════
          SUBMIT TAB
      ══════════════════════════════════════ */}
      {activeTab === "submit" && (
        <div>
          {/* Step 1 — pick field */}
          <div style={cardStyle}>
            <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#f6f7f9" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(35,37,47,0.4)" }}>Step 1</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#23252f", marginTop: 2 }}>Which part of the character are you improving?</div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                {FIELD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setFieldName(opt.value); setProposedValue(""); }}
                    style={{
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 9,
                      border: fieldName === opt.value ? "2px solid #23252f" : "1px solid rgba(0,0,0,0.1)",
                      background: fieldName === opt.value ? "#23252f" : "white",
                      cursor: "pointer",
                      transition: "all 0.12s",
                      fontFamily: "inherit",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: fieldName === opt.value ? "#ffffff" : "#23252f" }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: fieldName === opt.value ? "rgba(255,255,255,0.55)" : "rgba(35,37,47,0.45)", marginTop: 2, lineHeight: 1.4 }}>{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Step 2 — guide + current value */}
          <div style={cardStyle}>
            <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#f6f7f9" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(35,37,47,0.4)" }}>Step 2</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#23252f", marginTop: 2 }}>Understand what "{selectedLabel}" means</div>
            </div>
            <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(35,37,47,0.4)", marginBottom: 8 }}>What this field is</div>
                <div style={{ fontSize: 13, color: "rgba(35,37,47,0.8)", lineHeight: 1.7, background: "#f9fafb", borderRadius: 9, padding: "12px 14px" }}>
                  {guide.whatItIs}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(35,37,47,0.4)", marginBottom: 8 }}>How to write it</div>
                  <div style={{ background: "#f9fafb", borderRadius: 9, padding: "12px 14px" }}>
                    {guide.howToWrite.map((line, i) => (
                      <div key={i} style={{ fontSize: 13, color: "rgba(35,37,47,0.75)", display: "flex", gap: 8, marginBottom: i < guide.howToWrite.length - 1 ? 6 : 0 }}>
                        <span style={{ color: "#23252f", fontWeight: 700, flexShrink: 0 }}>·</span>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(35,37,47,0.4)", marginBottom: 8 }}>Sample (not real data)</div>
                <div style={{ fontSize: 13, color: "#23252f", background: "#eef6ff", borderRadius: 9, padding: "12px 14px", whiteSpace: "pre-wrap", lineHeight: 1.7, border: "1px solid rgba(59,130,246,0.12)" }}>
                  {guide.sample}
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(35,37,47,0.4)", marginBottom: 8 }}>Current live value</div>
                  <div style={{ fontSize: 13, color: currentValue ? "#23252f" : "rgba(35,37,47,0.35)", background: "#f9fafb", borderRadius: 9, padding: "12px 14px", whiteSpace: "pre-wrap", lineHeight: 1.7, fontStyle: currentValue ? "normal" : "italic" }}>
                    {currentValue || "Nothing set yet — this is a great field to contribute!"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 — write proposal */}
          <div style={cardStyle}>
            <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#f6f7f9" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(35,37,47,0.4)" }}>Step 3</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#23252f", marginTop: 2 }}>Write your proposal for "{selectedLabel}"</div>
              <div style={{ fontSize: 12, color: "rgba(35,37,47,0.5)", marginTop: 3 }}>
                Only submit a replacement for this specific field. Don't mix multiple fields together.
              </div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(35,37,47,0.55)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Your proposed {selectedLabel}
                </label>
                <textarea
                  value={proposedValue}
                  onChange={(e) => setProposedValue(e.target.value)}
                  rows={6}
                  style={{ ...inputStyle }}
                  placeholder={`Write the ${selectedLabel.toLowerCase()} here...`}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(35,37,47,0.55)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Why is this accurate? <span style={{ fontWeight: 400, textTransform: "none", color: "rgba(35,37,47,0.35)" }}>(optional but recommended)</span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    style={{ ...inputStyle }}
                    placeholder="e.g. In Chapter 3 she is referred to as..."
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(35,37,47,0.55)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Your name <span style={{ fontWeight: 400, textTransform: "none", color: "rgba(35,37,47,0.35)" }}>(optional)</span>
                  </label>
                  <input
                    value={submittedByName}
                    onChange={(e) => setSubmittedByName(e.target.value)}
                    style={{ ...inputStyle }}
                    placeholder="Anonymous"
                  />
                </div>
              </div>

              {error && (
                <div style={{ background: "#fee2e2", borderRadius: 9, padding: "10px 14px", fontSize: 13, color: "#991b1b", marginBottom: 12 }}>
                  {error}
                </div>
              )}
              {submitSuccess && (
                <div style={{ background: "#d1fae5", borderRadius: 9, padding: "10px 14px", fontSize: 13, color: "#065f46", marginBottom: 12 }}>
                  ✓ Proposal submitted! Switch to the Vote tab to see it.
                </div>
              )}

              <button
                type="button"
                onClick={() => void submitProposal()}
                disabled={isSubmitting || !proposedValue.trim()}
                style={{
                  borderRadius: 9, padding: "11px 24px", fontSize: 14, fontWeight: 700,
                  color: "#ffffff", background: proposedValue.trim() ? "#23252f" : "rgba(35,37,47,0.25)",
                  border: "none", cursor: proposedValue.trim() ? "pointer" : "not-allowed",
                  fontFamily: "inherit", transition: "background 0.15s",
                }}
              >
                {isSubmitting ? "Submitting…" : "Submit proposal →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          VOTE TAB
      ══════════════════════════════════════ */}
      {activeTab === "vote" && (
        <div>
          {submissions.length === 0 ? (
            <div style={{ ...cardStyle, padding: 32, textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🗳️</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#23252f", marginBottom: 6 }}>No proposals yet</div>
              <div style={{ fontSize: 13, color: "rgba(35,37,47,0.5)" }}>
                Be the first! Switch to "Submit a proposal" to contribute.
              </div>
            </div>
          ) : (
            <>
              <div style={{ background: "#fef3c7", borderRadius: 12, padding: "12px 16px", marginBottom: 16, border: "1px solid rgba(245,158,11,0.25)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
                <div style={{ fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
                  <strong>How to vote:</strong> When multiple people submit different answers for the same field, your vote helps pick the most accurate one.
                  Vote <strong>▲ up</strong> if it's lore-accurate and well-written. Vote <strong>▼ down</strong> if it's wrong or low quality.
                  The highest-voted proposal is most likely to get approved.
                </div>
              </div>

              {Object.entries(submissionsByField).map(([field, fieldSubmissions]) => {
                const fieldLabel = FIELD_OPTIONS.find((f) => f.value === field)?.label ?? field;
                const pending = fieldSubmissions.filter((s) => s.status === "pending");
                const reviewed = fieldSubmissions.filter((s) => s.status !== "pending");

                return (
                  <div key={field} style={cardStyle}>
                    {/* Field header */}
                    <div style={{ padding: "14px 20px", background: "#f6f7f9", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#23252f" }}>{fieldLabel}</div>
                        <div style={{ fontSize: 12, color: "rgba(35,37,47,0.5)", marginTop: 2 }}>
                          {FIELD_OPTIONS.find((f) => f.value === field)?.desc}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {pending.length > 0 && (
                          <span style={{ fontSize: 11, fontWeight: 600, background: "#fef3c7", color: "#92400e", borderRadius: 20, padding: "3px 10px" }}>
                            {pending.length} awaiting votes
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pending proposals — vote here */}
                    {pending.length > 0 && (
                      <div style={{ padding: "16px 20px" }}>
                        {pending.length > 1 && (
                          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(35,37,47,0.5)", marginBottom: 12, background: "#f0f2f5", borderRadius: 8, padding: "8px 12px" }}>
                            {pending.length} proposals submitted for this field — vote on which is most accurate ↓
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {pending.map((sub, i) => (
                            <div key={sub.id} style={{
                              border: "1px solid rgba(0,0,0,0.09)",
                              borderRadius: 11,
                              overflow: "hidden",
                              background: i === 0 && pending.length > 1 ? "#f0fdf4" : "white",
                            }}>
                              {/* Top row */}
                              <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                {i === 0 && pending.length > 1 && (
                                  <span style={{ fontSize: 11, fontWeight: 700, background: "#bbf7d0", color: "#14532d", borderRadius: 20, padding: "2px 8px" }}>
                                    🏆 Top voted
                                  </span>
                                )}
                                <span style={{ fontSize: 12, color: "rgba(35,37,47,0.45)" }}>
                                  by {sub.submitted_by_name || "Anonymous"}
                                </span>
                                <StatusPill status={sub.status} />
                              </div>

                              {/* Proposed value */}
                              <div style={{ padding: "14px", whiteSpace: "pre-wrap", fontSize: 14, color: "#23252f", lineHeight: 1.7 }}>
                                {sub.proposed_value}
                              </div>

                              {/* Reason */}
                              {sub.reason && (
                                <div style={{ padding: "0 14px 12px" }}>
                                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(35,37,47,0.4)", marginBottom: 6 }}>Reason given</div>
                                  <div style={{ fontSize: 12, color: "rgba(35,37,47,0.6)", background: "#f9fafb", borderRadius: 8, padding: "10px 12px", lineHeight: 1.6, fontStyle: "italic" }}>
                                    "{sub.reason}"
                                  </div>
                                </div>
                              )}

                              {/* Vote bar */}
                              <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(0,0,0,0.06)", background: "#fafafa", display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 12, color: "rgba(35,37,47,0.45)", marginRight: 4 }}>Is this accurate?</span>
                                <button
                                  type="button"
                                  onClick={() => void vote(sub.id, "upvote")}
                                  style={{
                                    display: "flex", alignItems: "center", gap: 6,
                                    border: "none", borderRadius: 8, padding: "7px 16px",
                                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                                    background: "#23252f", color: "white", fontFamily: "inherit",
                                    transition: "opacity 0.15s",
                                  }}
                                >
                                  ▲ Yes — {sub.upvotes}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void vote(sub.id, "downvote")}
                                  style={{
                                    display: "flex", alignItems: "center", gap: 6,
                                    border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, padding: "7px 16px",
                                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                                    background: "white", color: "rgba(35,37,47,0.6)", fontFamily: "inherit",
                                    transition: "background 0.15s",
                                  }}
                                >
                                  ▼ No — {sub.downvotes}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reviewed submissions (collapsed style) */}
                    {reviewed.length > 0 && (
                      <div style={{ padding: "12px 20px", borderTop: pending.length > 0 ? "1px solid rgba(0,0,0,0.06)" : undefined, background: "#fafafa" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(35,37,47,0.35)", marginBottom: 10 }}>
                          Previously reviewed
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {reviewed.map((sub) => (
                            <div key={sub.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 12px", borderRadius: 9, background: "white", border: "1px solid rgba(0,0,0,0.07)" }}>
                              <StatusPill status={sub.status} />
                              <div style={{ flex: 1, fontSize: 13, color: "rgba(35,37,47,0.65)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                                {sub.proposed_value}
                              </div>
                              <div style={{ fontSize: 12, color: "rgba(35,37,47,0.35)", flexShrink: 0 }}>
                                ▲ {sub.upvotes} / ▼ {sub.downvotes}
                              </div>
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