// app/admin/relationships/page.tsx
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RelationshipRow } from "@/lib/admin/relationships";

type JoinedRelationshipRow = RelationshipRow & {
  source: { name: string; key: string; avatar?: string | null } | null;
  target: { name: string; key: string; avatar?: string | null } | null;
};

function StatBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(((value + 100) / 200) * 100);
  const color = value >= 50 ? "#22c55e" : value >= 0 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(35,37,47,0.45)" }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{value > 0 ? `+${value}` : value}</span>
      </div>
      <div style={{ height: 5, borderRadius: 99, background: "rgba(35,37,47,0.08)", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99, transition: "width 0.3s" }} />
      </div>
    </div>
  );
}

function Avatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  const initial = name.charAt(0).toUpperCase();
  if (src) return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", border: "2px solid white", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#23252f", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 700, color: "white", border: "2px solid white", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", flexShrink: 0 }}>
      {initial}
    </div>
  );
}

export default async function AdminRelationshipsPage() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("character_relationships")
    .select("*, source:source_character_id(name,key,avatar), target:target_character_id(name,key,avatar)")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  const relationships = (data ?? []).map((r: any) => ({
    ...r,
    source: Array.isArray(r.source) ? r.source[0] ?? null : r.source,
    target: Array.isArray(r.target) ? r.target[0] ?? null : r.target,
  })) as JoinedRelationshipRow[];

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#23252f", margin: 0, letterSpacing: "-0.3px" }}>Relationships</h1>
          <p style={{ fontSize: 13, color: "rgba(35,37,47,0.5)", margin: "4px 0 0" }}>Manage how characters relate to each other.</p>
        </div>
        <Link href="/admin/relationships/new" style={{ display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600, color: "#ffffff", background: "#23252f", textDecoration: "none" }}>
          Relationship Map
        </Link>
      </div>

      {relationships.length === 0 ? (
        <div style={{ background: "white", borderRadius: 12, border: "1px dashed rgba(0,0,0,0.1)", padding: 32, textAlign: "center", fontSize: 13, color: "rgba(35,37,47,0.4)" }}>
          No relationships yet.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {relationships.map((rel) => {
            const srcName = rel.source?.name ?? "Unknown";
            const tgtName = rel.target?.name ?? "Unknown";
            const avgSentiment = Math.round((rel.affinity + rel.trust + rel.familiarity) / 3);
            const sentimentColor = avgSentiment >= 40 ? "#22c55e" : avgSentiment >= 0 ? "#f59e0b" : "#ef4444";
            const sentimentLabel = avgSentiment >= 60 ? "Allied" : avgSentiment >= 20 ? "Friendly" : avgSentiment >= 0 ? "Neutral" : avgSentiment >= -40 ? "Tense" : "Hostile";

            return (
              <div key={rel.id} style={{ background: "white", borderRadius: 14, border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden" }}>

                {/* ── Matching visual ── */}
                <div style={{ padding: "20px 20px 16px", background: "#f6f7f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 0 }}>

                    {/* Source */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 72 }}>
                      <Avatar name={srcName} src={rel.source?.avatar} size={44} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#23252f", textAlign: "center", lineHeight: 1.2 }}>{srcName}</span>
                    </div>

                    {/* Connecting line with label */}
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "0 8px" }}>
                      {/* Label above line */}
                      {rel.relationship_label && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(35,37,47,0.45)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, textAlign: "center" }}>
                          {rel.relationship_label}
                        </span>
                      )}
                      {/* Line with dots */}
                      <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 0 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: sentimentColor, flexShrink: 0 }} />
                        <div style={{ flex: 1, height: 2, background: `linear-gradient(90deg, ${sentimentColor}, ${sentimentColor})`, opacity: 0.4, position: "relative" }}>
                          {/* Arrow in center */}
                          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "white", border: `2px solid ${sentimentColor}`, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: sentimentColor, whiteSpace: "nowrap" }}>
                            {sentimentLabel}
                          </div>
                        </div>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: sentimentColor, flexShrink: 0 }} />
                      </div>
                    </div>

                    {/* Target */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 72 }}>
                      <Avatar name={tgtName} src={rel.target?.avatar} size={44} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#23252f", textAlign: "center", lineHeight: 1.2 }}>{tgtName}</span>
                    </div>
                  </div>
                </div>

                {/* ── Stats ── */}
                <div style={{ padding: "14px 18px" }}>
                  <StatBar value={rel.affinity} label="Affinity" />
                  <StatBar value={rel.trust} label="Trust" />
                  <StatBar value={rel.familiarity} label="Familiarity" />

                  {rel.notes && (
                    <div style={{ marginTop: 10, fontSize: 12, color: "rgba(35,37,47,0.55)", lineHeight: 1.6, background: "#f6f7f9", borderRadius: 8, padding: "8px 10px", borderLeft: "3px solid rgba(35,37,47,0.12)" }}>
                      {rel.notes.length > 120 ? rel.notes.slice(0, 120) + "…" : rel.notes}
                    </div>
                  )}
                </div>

                {/* ── Footer ── */}
                <div style={{ padding: "10px 18px", borderTop: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 11, color: "rgba(35,37,47,0.35)" }}>
                    {new Date(rel.updated_at).toLocaleDateString()}
                  </span>
                  {/* <Link href={`/admin/relationships/${rel.id}`} style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 12, fontWeight: 600, color: "#23252f",
                    textDecoration: "none", borderRadius: 7,
                    padding: "5px 12px", border: "1px solid rgba(0,0,0,0.1)",
                  }}>
                    Edit
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5h6M5 2l3 3-3 3" stroke="#23252f" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link> */}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}