"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Character = {
  id: string;
  name: string;
  key: string;
  avatar?: string | null;
  base_tone?: string | null;
  voice_only?: boolean | null;
  auto_play_voice?: boolean | null;
  annoyance_threshold?: number | null;
  updated_at?: string | null;
};

export default function CharacterList({ characters }: { characters: Character[] }) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (characters.length === 0) {
    return (
      <div style={{ background: "white", border: "1px dashed rgba(0,0,0,0.12)", borderRadius: 12, padding: 32, textAlign: "center", fontSize: 13, color: "rgba(35,37,47,0.4)" }}>
        No characters yet. Create one to get started.
      </div>
    );
  }

  if (isMobile) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <style>{`
          .edit-btn { display:inline-flex;align-items:center;gap:6px;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:600;color:#23252f;background:transparent;border:1px solid rgba(0,0,0,0.1);text-decoration:none; }
          .edit-btn:hover { background:#23252f !important;color:#ffffff !important; }
        `}</style>
        {characters.map((character) => (
          <div key={character.id} style={{ background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)", padding: "14px 16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                {character.avatar ? (
                  <img src={character.avatar} alt={character.name} style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(35,37,47,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "rgba(35,37,47,0.5)", flexShrink: 0 }}>
                    {character.name.charAt(0)}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#23252f", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{character.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(35,37,47,0.4)", fontFamily: "monospace", marginTop: 2 }}>{character.key}</div>
                </div>
              </div>
              <Link href={`/admin/characters/${character.id}`} className="edit-btn" style={{ flexShrink: 0 }}>
                Edit
                <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                  <path d="M2 5.5h7M5.5 2l3.5 3.5L5.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "rgba(35,37,47,0.5)", background: "rgba(35,37,47,0.05)", borderRadius: 5, padding: "3px 8px" }}>
                {character.voice_only ? "Voice" : "Text"}{character.auto_play_voice ? " · Auto" : ""}
              </span>
              {character.base_tone && (
                <span style={{ fontSize: 11, color: "rgba(35,37,47,0.5)", background: "rgba(35,37,47,0.05)", borderRadius: 5, padding: "3px 8px" }}>
                  {character.base_tone}
                </span>
              )}
              <span style={{ fontSize: 11, color: "rgba(35,37,47,0.4)", marginLeft: "auto" }}>
                {character.updated_at ? new Date(character.updated_at).toLocaleDateString() : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
      <style>{`
        .edit-btn { display:inline-flex;align-items:center;gap:6px;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:600;color:#23252f;background:transparent;border:1px solid rgba(0,0,0,0.1);text-decoration:none; }
        .edit-btn:hover { background:#23252f !important;color:#ffffff !important; }
        .char-row:hover { background:#f6f7f9; }
      `}</style>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f6f7f9", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
            {["Name", "Key", "Base Tone", "Voice", "Threshold", "Updated", ""].map((h) => (
              <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "rgba(35,37,47,0.45)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {characters.map((character, i) => (
            <tr key={character.id} className="char-row" style={{ borderTop: i === 0 ? "none" : "1px solid rgba(0,0,0,0.06)", transition: "background 0.1s" }}>
              <td style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {character.avatar ? (
                    <img src={character.avatar} alt={character.name} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(35,37,47,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "rgba(35,37,47,0.5)", flexShrink: 0 }}>
                      {character.name.charAt(0)}
                    </div>
                  )}
                  <span style={{ fontWeight: 600, color: "#23252f" }}>{character.name}</span>
                </div>
              </td>
              <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 12, color: "rgba(35,37,47,0.5)" }}>{character.key}</td>
              <td style={{ padding: "12px 16px", color: "rgba(35,37,47,0.5)" }}>{character.base_tone ?? "—"}</td>
              <td style={{ padding: "12px 16px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 500, background: "rgba(35,37,47,0.06)", color: "#23252f" }}>
                  {character.voice_only ? "Voice" : "Text"}{character.auto_play_voice ? " · Auto" : ""}
                </span>
              </td>
              <td style={{ padding: "12px 16px", color: "rgba(35,37,47,0.5)" }}>{character.annoyance_threshold ?? 85}</td>
              <td style={{ padding: "12px 16px", color: "rgba(35,37,47,0.4)", fontSize: 12 }}>
                {character.updated_at ? new Date(character.updated_at).toLocaleDateString() : "—"}
              </td>
              <td style={{ padding: "12px 16px", textAlign: "right" }}>
                <Link href={`/admin/characters/${character.id}`} className="edit-btn">
                  Edit
                  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                    <path d="M2 5.5h7M5.5 2l3.5 3.5L5.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}