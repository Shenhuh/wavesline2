"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type {
  EventContributableField,
  EventSubmissionRow,
} from "@/lib/event-submissions";

// ── Types ─────────────────────────────────────────────────────────────
interface EventStub {
  id: string;
  title: string;
  slug: string;
  order: number;
  importance: number;
}

interface CharacterStub {
  key: string;
  name: string;
  avatar: string | null;
}

interface CharacterEntry {
  key: string;
  name: string;
  avatar: string | null;
  role: string;
}

// ── Field config ──────────────────────────────────────────────────────
const FIELD_OPTIONS: Array<{
  value: EventContributableField;
  label: string;
  desc: string;
  icon: string;
}> = [
  {
    value: "order",
    label: "Event Rank / Order",
    icon: "🔢",
    desc: "Where this event sits in the timeline",
  },
  {
    value: "importance",
    label: "Importance",
    icon: "⭐",
    desc: "How major this event is (1–10)",
  },
  {
    value: "details",
    label: "Details",
    icon: "📄",
    desc: "Full event description",
  },
  {
    value: "involved_characters",
    label: "Involved Characters",
    icon: "👥",
    desc: "Who was in this event and what they did",
  },
];

const FIELD_GUIDE: Record<
  EventContributableField,
  { tip: string; sample: string }
> = {
  title: { tip: "", sample: "" },
  slug: { tip: "", sample: "" },
  order: {
    tip: "Drag the slider to position this event in the timeline relative to all others.",
    sample: "",
  },
  importance: {
    tip: "A number from 1 to 10. Reserve 8–10 for major story-defining events.",
    sample: "6",
  },
  details: {
    tip: "Focused description of this event only. No unrelated lore.",
    sample:
      "This event marked the first public-facing stage of the project and established the initial systems that shaped how users interacted with the world.",
  },
  involved_characters: {
    tip: "Drag characters from the left panel into the event roster. Then describe what each one did.",
    sample: "",
  },
};

// ── Helpers ───────────────────────────────────────────────────────────
function StatusPill({
  status,
}: {
  status: "pending" | "approved" | "rejected";
}) {
  const map = {
    pending: {
      bg: "rgba(251,191,36,0.12)",
      color: "#fbbf24",
      border: "rgba(251,191,36,0.25)",
      label: "⏳ Pending",
    },
    approved: {
      bg: "rgba(52,211,153,0.12)",
      color: "#34d399",
      border: "rgba(52,211,153,0.25)",
      label: "✓ Approved",
    },
    rejected: {
      bg: "rgba(248,113,113,0.12)",
      color: "#f87171",
      border: "rgba(248,113,113,0.25)",
      label: "✗ Rejected",
    },
  };
  const s = map[status];
  return (
    <span
      style={{
        borderRadius: 20,
        padding: "2px 9px",
        fontSize: 11,
        fontWeight: 700,
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      {s.label}
    </span>
  );
}

function Avatar({
  char,
  size = 32,
}: {
  char: { name: string; avatar: string | null };
  size?: number;
}) {
  if (char.avatar) {
    return (
      <img
        src={char.avatar}
        alt={char.name}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: "linear-gradient(135deg, #1d4ed8, #6d28d9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.4,
        fontWeight: 700,
        color: "white",
      }}
    >
      {char.name.charAt(0)}
    </div>
  );
}

// ── Rank/Order visualiser ─────────────────────────────────────────────
function RankEditor({
  allEvents,
  currentSlug,
  currentOrder,
  onChange,
}: {
  allEvents: EventStub[];
  currentSlug: string;
  currentOrder: number;
  onChange: (newOrder: number) => void;
}) {
  const sorted = useMemo(
    () => [...allEvents].sort((a, b) => a.order - b.order),
    [allEvents]
  );

  const thisEvent = allEvents.find((e) => e.slug === currentSlug);
  const others = sorted.filter((e) => e.slug !== currentSlug);

  const [insertAt, setInsertAt] = useState<number>(() => {
    const idx = others.findIndex((e) => e.order >= currentOrder);
    return idx === -1 ? others.length : idx;
  });

  const proposedOrder = useMemo(() => {
    return insertAt + 1;
  }, [insertAt]);

  useEffect(() => {
    onChange(proposedOrder);
  }, [proposedOrder, onChange]);

  const withThis: Array<EventStub | "THIS"> = [
    ...others.slice(0, insertAt),
    "THIS",
    ...others.slice(insertAt),
  ];

  return (
    <div>
      <div
        style={{
          fontSize: 12,
          color: "rgba(148,163,184,0.5)",
          marginBottom: 12,
        }}
      >
        Drag{" "}
        <strong style={{ color: "#c7d2fe" }}>
          {thisEvent?.title ?? "this event"}
        </strong>{" "}
        to the correct position in the timeline. Click the arrows to move it up
        or down.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {withThis.map((item, i) => {
          if (item === "THIS") {
            return (
              <div
                key="THIS"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background:
                    "linear-gradient(135deg, rgba(37,99,235,0.2), rgba(124,58,237,0.2))",
                  border: "1px solid rgba(99,102,241,0.4)",
                }}
              >
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: "#a5b4fc",
                    minWidth: 28,
                  }}
                >
                  #{i + 1}
                </span>
                <span style={{ fontSize: 18 }}>📅</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#e2e8f0",
                    flex: 1,
                  }}
                >
                  {thisEvent?.title ?? "This event"}{" "}
                  <span
                    style={{
                      fontSize: 11,
                      color: "#a5b4fc",
                      fontWeight: 400,
                    }}
                  >
                    (your proposal)
                  </span>
                </span>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 3 }}
                >
                  <button
                    type="button"
                    disabled={insertAt === 0}
                    onClick={() => setInsertAt((n) => Math.max(0, n - 1))}
                    style={{
                      border: "none",
                      background: "rgba(255,255,255,0.08)",
                      color: "rgba(226,232,240,0.7)",
                      borderRadius: 5,
                      padding: "2px 8px",
                      cursor: insertAt === 0 ? "default" : "pointer",
                      fontSize: 12,
                      opacity: insertAt === 0 ? 0.3 : 1,
                    }}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={insertAt >= others.length}
                    onClick={() =>
                      setInsertAt((n) => Math.min(others.length, n + 1))
                    }
                    style={{
                      border: "none",
                      background: "rgba(255,255,255,0.08)",
                      color: "rgba(226,232,240,0.7)",
                      borderRadius: 5,
                      padding: "2px 8px",
                      cursor:
                        insertAt >= others.length ? "default" : "pointer",
                      fontSize: 12,
                      opacity: insertAt >= others.length ? 0.3 : 1,
                    }}
                  >
                    ▼
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.slug}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "rgba(148,163,184,0.4)",
                  minWidth: 28,
                }}
              >
                #{i + 1}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: "rgba(226,232,240,0.55)",
                  flex: 1,
                }}
              >
                {item.title}
              </span>
              <span
                style={{ fontSize: 11, color: "rgba(148,163,184,0.3)" }}
              >
                order {item.order}
              </span>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: "rgba(148,163,184,0.4)",
        }}
      >
        Proposed order value:{" "}
        <strong style={{ color: "#93c5fd" }}>{proposedOrder}</strong>
      </div>
    </div>
  );
}

// ── Character drag-and-drop builder ──────────────────────────────────
function CharacterBuilder({
  allCharacters,
  value,
  onChange,
}: {
  allCharacters: CharacterStub[];
  value: CharacterEntry[];
  onChange: (entries: CharacterEntry[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItem = useRef<string | null>(null);

  const available = allCharacters.filter(
    (c) =>
      !value.find((e) => e.key === c.key) &&
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  function addChar(char: CharacterStub) {
    onChange([
      ...value,
      { key: char.key, name: char.name, avatar: char.avatar, role: "" },
    ]);
  }

  function removeChar(key: string) {
    onChange(value.filter((e) => e.key !== key));
  }

  function updateRole(key: string, role: string) {
    onChange(value.map((e) => (e.key === key ? { ...e, role } : e)));
  }

  function reorder(fromKey: string, toIndex: number) {
    const from = value.findIndex((e) => e.key === fromKey);
    if (from === -1) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(toIndex, 0, item);
    onChange(next);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 14 }}>
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: "rgba(148,163,184,0.4)",
            marginBottom: 8,
          }}
        >
          Characters
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          style={{
            width: "100%",
            boxSizing: "border-box",
            marginBottom: 8,
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "7px 10px",
            fontSize: 12,
            color: "#e2e8f0",
            background: "rgba(0,0,0,0.3)",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
            maxHeight: 320,
            overflowY: "auto",
          }}
        >
          {available.length === 0 && (
            <div
              style={{
                fontSize: 12,
                color: "rgba(148,163,184,0.3)",
                padding: "8px 0",
              }}
            >
              {allCharacters.length === 0 ? "No characters available" : "All added"}
            </div>
          )}
          {available.map((char) => (
            <button
              key={char.key}
              type="button"
              draggable
              onDragStart={() => {
                dragItem.current = char.key;
              }}
              onClick={() => addChar(char)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "7px 10px",
                borderRadius: 8,
                cursor: "grab",
                border: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.02)",
                textAlign: "left",
                fontFamily: "inherit",
                transition: "background 0.12s",
              }}
            >
              <Avatar char={char} size={26} />
              <span
                style={{
                  fontSize: 12,
                  color: "rgba(226,232,240,0.7)",
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {char.name}
              </span>
            </button>
          ))}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "rgba(148,163,184,0.3)",
            marginTop: 8,
          }}
        >
          Click or drag → to add
        </div>
      </div>

      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
            color: "rgba(148,163,184,0.4)",
            marginBottom: 8,
          }}
        >
          Event Roster{" "}
          {value.length > 0 && (
            <span style={{ color: "rgba(99,102,241,0.8)" }}>
              · {value.length} added
            </span>
          )}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const key = dragItem.current;
            if (!key) return;
            const char = allCharacters.find((c) => c.key === key);
            if (char && !value.find((v) => v.key === key)) {
              addChar(char);
            }
            dragItem.current = null;
            setDragOverIndex(null);
          }}
          style={{
            minHeight: value.length === 0 ? 80 : undefined,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {value.length === 0 && (
            <div
              style={{
                height: 80,
                borderRadius: 10,
                border: "2px dashed rgba(99,102,241,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                color: "rgba(148,163,184,0.35)",
              }}
            >
              ← Add characters from the list
            </div>
          )}

          {value.map((entry, idx) => (
            <div
              key={entry.key}
              draggable
              onDragStart={() => {
                dragItem.current = entry.key;
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverIndex(idx);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const key = dragItem.current;
                if (key && key !== entry.key) reorder(key, idx);
                dragItem.current = null;
                setDragOverIndex(null);
              }}
              onDragLeave={() => setDragOverIndex(null)}
              style={{
                borderRadius: 10,
                border:
                  dragOverIndex === idx
                    ? "1px solid rgba(99,102,241,0.5)"
                    : "1px solid rgba(255,255,255,0.08)",
                background:
                  dragOverIndex === idx
                    ? "rgba(99,102,241,0.08)"
                    : "rgba(0,0,0,0.2)",
                overflow: "hidden",
                cursor: "grab",
                transition: "border-color 0.12s, background 0.12s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: "rgba(148,163,184,0.3)",
                    cursor: "grab",
                  }}
                >
                  ⠿
                </span>
                <Avatar char={entry} size={28} />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#e2e8f0",
                    flex: 1,
                  }}
                >
                  {entry.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeChar(entry.key)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "rgba(248,113,113,0.6)",
                    cursor: "pointer",
                    fontSize: 16,
                    padding: "0 2px",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>

              <div style={{ padding: "10px 12px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "rgba(148,163,184,0.4)",
                    marginBottom: 5,
                  }}
                >
                  What did {entry.name} do in this event?
                </label>
                <textarea
                  value={entry.role}
                  onChange={(e) => updateRole(entry.key, e.target.value)}
                  rows={2}
                  placeholder={`e.g. Led the assault on the Fractsidus headquarters…`}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.08)",
                    padding: "8px 10px",
                    fontSize: 12,
                    color: "#e2e8f0",
                    background: "rgba(0,0,0,0.25)",
                    outline: "none",
                    fontFamily: "inherit",
                    lineHeight: 1.55,
                    resize: "vertical",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function serializeCharacters(entries: CharacterEntry[]): string {
  return entries
    .map((e) => `${e.key}${e.role ? ` — ${e.role}` : ""}`)
    .join("\n");
}

// ── Main component ────────────────────────────────────────────────────
export default function EventContributionClient({
  eventKey,
  currentOrder,
  currentImportance,
  submissions,
  currentFieldValues,
  allEvents,
  allCharacters,
}: {
  eventKey: string;
  currentOrder: number;
  currentImportance: number;
  submissions: EventSubmissionRow[];
  currentFieldValues: Record<string, string>;
  allEvents: EventStub[];
  allCharacters: CharacterStub[];
}) {
  const router = useRouter();
  const [fieldName, setFieldName] =
    useState<EventContributableField>("order");
  const [submittedByName, setSubmittedByName] = useState("");
  const [reason, setReason] = useState("");
  const [proposedValue, setProposedValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"submit" | "vote">("submit");
  const [guideOpen, setGuideOpen] = useState(false);

  const [charEntries, setCharEntries] = useState<CharacterEntry[]>([]);
  const [proposedOrder, setProposedOrder] = useState<number>(currentOrder);

  const guide = FIELD_GUIDE[fieldName];
  const selectedOpt = FIELD_OPTIONS.find((f) => f.value === fieldName)!;
  const currentValue = currentFieldValues[fieldName] || "";

  const submissionsByField = useMemo(() => {
    const groups: Record<string, EventSubmissionRow[]> = {};
    for (const s of submissions) {
      if (!groups[s.field_name]) groups[s.field_name] = [];
      groups[s.field_name].push(s);
    }
    for (const k of Object.keys(groups)) {
      groups[k].sort((a, b) => b.upvotes - a.upvotes);
    }
    return groups;
  }, [submissions]);

  const pendingCount = submissions.filter((s) => s.status === "pending").length;

  const effectiveValue = useMemo(() => {
    if (fieldName === "involved_characters") {
      return serializeCharacters(charEntries);
    }
    if (fieldName === "order") {
      return String(proposedOrder);
    }
    return proposedValue;
  }, [fieldName, charEntries, proposedOrder, proposedValue]);

  const canSubmit = effectiveValue.trim().length > 0;

  async function submitProposal() {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/event-contributions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventKey, fieldName, proposedValue: effectiveValue, reason, submittedByName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to submit.");
        return;
      }

      setSubmittedByName("");
      setReason("");
      setProposedValue("");
      setCharEntries([]);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 4000);
      router.refresh();
    } catch {
      setError("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function vote(submissionId: string, voteType: "upvote" | "downvote") {
    const res = await fetch("/api/event-contributions/vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ submissionId, voteType }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error || "Failed to vote.");
      return;
    }
    router.refresh();
  }

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.07)",
    marginBottom: 14,
    overflow: "hidden",
  };

  const inp: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.1)",
    padding: "10px 13px",
    fontSize: 13,
    color: "#e2e8f0",
    background: "rgba(0,0,0,0.3)",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: 1.6,
    resize: "vertical",
  };

  const lbl: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.07em",
    color: "rgba(148,163,184,0.55)",
    marginBottom: 6,
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 3,
          background: "rgba(0,0,0,0.35)",
          borderRadius: 12,
          padding: 3,
          border: "1px solid rgba(255,255,255,0.07)",
          marginBottom: 18,
        }}
      >
        {[
          { id: "submit", label: "✏️  Submit" },
          {
            id: "vote",
            label: `🗳️  Vote${pendingCount > 0 ? `  ·  ${pendingCount}` : ""}`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as "submit" | "vote")}
            style={{
              flex: 1,
              padding: "9px 12px",
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              borderRadius: 9,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.15s",
              background:
                activeTab === tab.id
                  ? "linear-gradient(135deg,#2563eb,#7c3aed)"
                  : "transparent",
              color:
                activeTab === tab.id ? "#fff" : "rgba(148,163,184,0.45)",
              boxShadow:
                activeTab === tab.id
                  ? "0 2px 10px rgba(99,102,241,0.3)"
                  : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "submit" && (
        <div>
          <div style={card}>
            <div
              style={{
                padding: "13px 18px 11px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "rgba(99,102,241,0.8)",
                  marginBottom: 2,
                }}
              >
                Step 1
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#f1f5f9",
                }}
              >
                Which field are you improving?
              </div>
            </div>
            <div style={{ padding: "14px 18px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                  gap: 7,
                }}
              >
                {FIELD_OPTIONS.map((opt) => {
                  const active = fieldName === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setFieldName(opt.value);
                        setProposedValue("");
                        setGuideOpen(false);
                      }}
                      style={{
                        textAlign: "left",
                        padding: "9px 12px",
                        borderRadius: 9,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.12s",
                        border: active
                          ? "1px solid rgba(99,102,241,0.5)"
                          : "1px solid rgba(255,255,255,0.07)",
                        background: active
                          ? "rgba(99,102,241,0.15)"
                          : "rgba(255,255,255,0.02)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: active ? "#c7d2fe" : "rgba(226,232,240,0.7)",
                        }}
                      >
                        {opt.icon} {opt.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: active
                            ? "rgba(199,210,254,0.5)"
                            : "rgba(148,163,184,0.35)",
                          marginTop: 2,
                          lineHeight: 1.4,
                        }}
                      >
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={card}>
            <div
              style={{
                padding: "13px 18px 11px",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "rgba(99,102,241,0.8)",
                    marginBottom: 2,
                  }}
                >
                  Step 2
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#f1f5f9",
                  }}
                >
                  {fieldName === "order"
                    ? "Where does this event belong in the timeline?"
                    : fieldName === "involved_characters"
                      ? "Who was in this event and what did they do?"
                      : (
                        <>
                          Write your proposal for{" "}
                          <span style={{ color: "#93c5fd" }}>
                            {selectedOpt.label}
                          </span>
                        </>
                      )}
                </div>
              </div>
              {guide.tip && (
                <button
                  type="button"
                  onClick={() => setGuideOpen((o) => !o)}
                  style={{
                    flexShrink: 0,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "5px 11px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: guideOpen
                      ? "rgba(99,102,241,0.15)"
                      : "transparent",
                    color: guideOpen
                      ? "#c7d2fe"
                      : "rgba(148,163,184,0.5)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {guideOpen ? "Hide guide ↑" : "What goes here? ↓"}
                </button>
              )}
            </div>

            {guideOpen &&
              guide.tip &&
              fieldName !== "order" &&
              fieldName !== "involved_characters" && (
                <div
                  style={{
                    padding: "14px 18px",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(0,0,0,0.15)",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.07em",
                          color: "rgba(148,163,184,0.4)",
                          marginBottom: 7,
                        }}
                      >
                        💡 Tip
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "rgba(226,232,240,0.6)",
                          lineHeight: 1.7,
                          background: "rgba(99,102,241,0.07)",
                          borderRadius: 9,
                          padding: "10px 13px",
                          border: "1px solid rgba(99,102,241,0.12)",
                        }}
                      >
                        {guide.tip}
                      </div>
                    </div>
                    {guide.sample && (
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                            color: "rgba(148,163,184,0.4)",
                            marginBottom: 7,
                          }}
                        >
                          📝 Example format
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#93c5fd",
                            whiteSpace: "pre-wrap",
                            lineHeight: 1.7,
                            background: "rgba(37,99,235,0.07)",
                            borderRadius: 9,
                            padding: "10px 13px",
                            border: "1px solid rgba(96,165,250,0.15)",
                          }}
                        >
                          {guide.sample}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            <div style={{ padding: "16px 18px" }}>
              {fieldName === "order" && (
                <RankEditor
                  allEvents={allEvents}
                  currentSlug={eventKey}
                  currentOrder={currentOrder}
                  onChange={setProposedOrder}
                />
              )}

              {fieldName === "involved_characters" && (
                <CharacterBuilder
                  allCharacters={allCharacters}
                  value={charEntries}
                  onChange={setCharEntries}
                />
              )}

              {fieldName !== "order" &&
                fieldName !== "involved_characters" && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={lbl}>Your proposed {selectedOpt.label}</label>
                    <textarea
                      value={proposedValue}
                      onChange={(e) => setProposedValue(e.target.value)}
                      rows={5}
                      style={inp}
                      placeholder={`Write the ${selectedOpt.label.toLowerCase()} here…`}
                    />
                  </div>
                )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 16,
                  marginTop:
                    fieldName === "order" || fieldName === "involved_characters"
                      ? 16
                      : 0,
                }}
              >
                <div>
                  <label style={lbl}>
                    Why is this better?{" "}
                    <span
                      style={{
                        fontWeight: 400,
                        textTransform: "none",
                        opacity: 0.5,
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    style={inp}
                    placeholder="e.g. This version is more accurate because…"
                  />
                </div>
                <div>
                  <label style={lbl}>
                    Your name{" "}
                    <span
                      style={{
                        fontWeight: 400,
                        textTransform: "none",
                        opacity: 0.5,
                      }}
                    >
                      (optional)
                    </span>
                  </label>
                  <input
                    value={submittedByName}
                    onChange={(e) => setSubmittedByName(e.target.value)}
                    style={inp}
                    placeholder="Anonymous"
                  />
                </div>
              </div>

              {error && (
                <div
                  style={{
                    background: "rgba(248,113,113,0.1)",
                    border: "1px solid rgba(248,113,113,0.2)",
                    borderRadius: 9,
                    padding: "10px 13px",
                    fontSize: 12,
                    color: "#fca5a5",
                    marginBottom: 12,
                  }}
                >
                  ⚠️ {error}
                </div>
              )}
              {submitSuccess && (
                <div
                  style={{
                    background: "rgba(52,211,153,0.1)",
                    border: "1px solid rgba(52,211,153,0.2)",
                    borderRadius: 9,
                    padding: "10px 13px",
                    fontSize: 12,
                    color: "#6ee7b7",
                    marginBottom: 12,
                  }}
                >
                  ✅ Submitted! Switch to the Vote tab to see it.
                </div>
              )}

              <button
                type="button"
                onClick={() => void submitProposal()}
                disabled={isSubmitting || !canSubmit}
                style={{
                  borderRadius: 9,
                  padding: "10px 24px",
                  fontSize: 13,
                  fontWeight: 700,
                  border: "none",
                  fontFamily: "inherit",
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  background: canSubmit
                    ? "linear-gradient(135deg,#2563eb,#7c3aed)"
                    : "rgba(255,255,255,0.06)",
                  color: canSubmit ? "#fff" : "rgba(255,255,255,0.2)",
                  boxShadow: canSubmit
                    ? "0 3px 12px rgba(99,102,241,0.35)"
                    : "none",
                  transition: "all 0.15s",
                }}
              >
                {isSubmitting ? "Submitting…" : "Submit proposal →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "vote" && (
        <div>
          {submissions.length === 0 ? (
            <div style={{ ...card, padding: 40, textAlign: "center" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🗳️</div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#f1f5f9",
                  marginBottom: 6,
                }}
              >
                No proposals yet
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "rgba(148,163,184,0.5)",
                  marginBottom: 18,
                }}
              >
                Be the first to contribute.
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("submit")}
                style={{
                  padding: "9px 22px",
                  borderRadius: 9,
                  background: "linear-gradient(135deg,#2563eb,#7c3aed)",
                  border: "none",
                  color: "white",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                ✏️ Submit a proposal
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(148,163,184,0.45)",
                  marginBottom: 14,
                  padding: "0 2px",
                }}
              >
                Vote <strong style={{ color: "rgba(148,163,184,0.7)" }}>▲ Yes</strong>{" "}
                if the proposal is accurate. Vote{" "}
                <strong style={{ color: "rgba(148,163,184,0.7)" }}>▼ No</strong>{" "}
                if it's wrong or unclear.
              </div>

              {Object.entries(submissionsByField).map(([field, fieldSubs]) => {
                const opt = FIELD_OPTIONS.find((f) => f.value === field);
                const pending = fieldSubs.filter((s) => s.status === "pending");
                const reviewed = fieldSubs.filter((s) => s.status !== "pending");

                return (
                  <div key={field} style={card}>
                    <div
                      style={{
                        padding: "12px 18px",
                        borderBottom: "1px solid rgba(255,255,255,0.06)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: "#f1f5f9",
                        }}
                      >
                        {opt?.icon} {opt?.label ?? field}
                        <span
                          style={{
                            fontSize: 11,
                            color: "rgba(148,163,184,0.4)",
                            fontWeight: 400,
                            marginLeft: 8,
                          }}
                        >
                          {opt?.desc}
                        </span>
                      </div>
                      {pending.length > 0 && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            background: "rgba(251,191,36,0.12)",
                            color: "#fbbf24",
                            border: "1px solid rgba(251,191,36,0.25)",
                            borderRadius: 20,
                            padding: "2px 9px",
                          }}
                        >
                          {pending.length} awaiting votes
                        </span>
                      )}
                    </div>

                    {pending.length > 0 && (
                      <div style={{ padding: "14px 18px" }}>
                        {pending.length > 1 && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "rgba(148,163,184,0.45)",
                              marginBottom: 12,
                            }}
                          >
                            {pending.length} proposals — vote on the best one:
                          </div>
                        )}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                          }}
                        >
                          {pending.map((sub, i) => (
                            <div
                              key={sub.id}
                              style={{
                                borderRadius: 11,
                                overflow: "hidden",
                                border:
                                  i === 0 && pending.length > 1
                                    ? "1px solid rgba(52,211,153,0.2)"
                                    : "1px solid rgba(255,255,255,0.07)",
                                background:
                                  i === 0 && pending.length > 1
                                    ? "rgba(52,211,153,0.04)"
                                    : "rgba(0,0,0,0.15)",
                              }}
                            >
                              <div
                                style={{
                                  padding: "8px 13px",
                                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  flexWrap: "wrap",
                                }}
                              >
                                {i === 0 && pending.length > 1 && (
                                  <span
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 700,
                                      background: "rgba(52,211,153,0.12)",
                                      color: "#34d399",
                                      border: "1px solid rgba(52,211,153,0.25)",
                                      borderRadius: 20,
                                      padding: "2px 8px",
                                    }}
                                  >
                                    🏆 Top voted
                                  </span>
                                )}
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "rgba(148,163,184,0.4)",
                                  }}
                                >
                                  by {sub.submitted_by_name || "Anonymous"}
                                </span>
                                <StatusPill status={sub.status} />
                              </div>

                              <div
                                style={{
                                  padding: "12px 13px",
                                  whiteSpace: "pre-wrap",
                                  fontSize: 13,
                                  color: "#e2e8f0",
                                  lineHeight: 1.75,
                                }}
                              >
                                {sub.proposed_value}
                              </div>

                              {sub.reason && (
                                <div style={{ padding: "0 13px 12px" }}>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      fontStyle: "italic",
                                      color: "rgba(148,163,184,0.45)",
                                      background: "rgba(255,255,255,0.03)",
                                      borderRadius: 8,
                                      padding: "8px 11px",
                                      border: "1px solid rgba(255,255,255,0.05)",
                                    }}
                                  >
                                    "{sub.reason}"
                                  </div>
                                </div>
                              )}

                              <div
                                style={{
                                  padding: "10px 13px",
                                  borderTop: "1px solid rgba(255,255,255,0.05)",
                                  background: "rgba(0,0,0,0.1)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "rgba(148,163,184,0.35)",
                                    marginRight: 2,
                                  }}
                                >
                                  Better?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => void vote(sub.id, "upvote")}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    border: "none",
                                    borderRadius: 7,
                                    padding: "6px 15px",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    background:
                                      "linear-gradient(135deg,#2563eb,#7c3aed)",
                                    color: "white",
                                    fontFamily: "inherit",
                                    boxShadow:
                                      "0 2px 8px rgba(99,102,241,0.25)",
                                  }}
                                >
                                  ▲ Yes — {sub.upvotes}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void vote(sub.id, "downvote")}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    border: "1px solid rgba(255,255,255,0.09)",
                                    borderRadius: 7,
                                    padding: "6px 15px",
                                    fontSize: 12,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    background: "rgba(255,255,255,0.04)",
                                    color: "rgba(148,163,184,0.55)",
                                    fontFamily: "inherit",
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

                    {reviewed.length > 0 && (
                      <div
                        style={{
                          padding: "10px 18px 14px",
                          borderTop: pending.length > 0
                            ? "1px solid rgba(255,255,255,0.05)"
                            : undefined,
                          background: "rgba(0,0,0,0.1)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            color: "rgba(148,163,184,0.3)",
                            marginBottom: 8,
                          }}
                        >
                          Previously reviewed
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 7,
                          }}
                        >
                          {reviewed.map((sub) => (
                            <div
                              key={sub.id}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 9,
                                padding: "9px 11px",
                                borderRadius: 8,
                                background: "rgba(255,255,255,0.02)",
                                border: "1px solid rgba(255,255,255,0.05)",
                              }}
                            >
                              <StatusPill status={sub.status} />
                              <div
                                style={{
                                  flex: 1,
                                  fontSize: 12,
                                  color: "rgba(226,232,240,0.5)",
                                  whiteSpace: "pre-wrap",
                                  lineHeight: 1.6,
                                }}
                              >
                                {sub.proposed_value}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "rgba(148,163,184,0.3)",
                                  flexShrink: 0,
                                }}
                              >
                                ▲{sub.upvotes} ▼{sub.downvotes}
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