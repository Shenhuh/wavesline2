import { listAdminCharacters } from "@/lib/admin/characters";
import Link from "next/link";

export default async function AdminPage() {
  const characters = await listAdminCharacters();
  const totalCharacters = characters.length;
  const voiceCharacters = characters.filter((c) => c.voice_only).length;
  const recentCharacters = [...characters]
    .sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime())
    .slice(0, 4);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#23252f", margin: 0, letterSpacing: "-0.3px" }}>Dashboard</h1>
        <p style={{ fontSize: 13, color: "rgba(35,37,47,0.5)", margin: "4px 0 0" }}>WavesLine admin overview.</p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Total Characters", value: totalCharacters, href: "/admin/characters" },
          { label: "Voice Characters", value: voiceCharacters, href: "/admin/characters" },
          { label: "Text Characters", value: totalCharacters - voiceCharacters, href: "/admin/characters" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href} style={{ textDecoration: "none", display: "block", background: "white", borderRadius: 12, padding: "18px 20px", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#23252f", lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: "rgba(35,37,47,0.45)", marginTop: 6 }}>{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Recently updated characters */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#23252f" }}>Recently Updated</span>
          <Link href="/admin/characters" style={{ fontSize: 12, color: "rgba(35,37,47,0.4)", textDecoration: "none" }}>View all →</Link>
        </div>
        {recentCharacters.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "rgba(35,37,47,0.35)" }}>No characters yet.</div>
        ) : (
          recentCharacters.map((character, i) => (
            <Link
              key={character.id}
              href={`/admin/characters/${character.id}`}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 20px",
                borderTop: i === 0 ? "none" : "1px solid rgba(0,0,0,0.05)",
                textDecoration: "none", transition: "background 0.12s",
              }}
            >
              {character.avatar ? (
                <img src={character.avatar} alt={character.name} style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(35,37,47,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "rgba(35,37,47,0.45)", flexShrink: 0 }}>
                  {character.name.charAt(0)}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#23252f" }}>{character.name}</div>
                <div style={{ fontSize: 11, color: "rgba(35,37,47,0.4)", fontFamily: "monospace", marginTop: 1 }}>{character.key}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: "rgba(35,37,47,0.4)", background: "rgba(35,37,47,0.05)", borderRadius: 5, padding: "2px 8px" }}>
                  {character.voice_only ? "Voice" : "Text"}
                </span>
                <span style={{ fontSize: 11, color: "rgba(35,37,47,0.35)" }}>
                  {character.updated_at ? new Date(character.updated_at).toLocaleDateString() : "—"}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.25 }}>
                  <path d="M2 6h8M6 2l4 4-4 4" stroke="#23252f" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}