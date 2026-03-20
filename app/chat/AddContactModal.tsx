"use client";

import { useState } from "react";

type ContactOption = { id: string; name: string; title?: string | null; key: string };

export default function AddContactModal({ availableCharacters }: { availableCharacters: ContactOption[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          width: "100%", background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 8, padding: "7px 12px",
          fontSize: 11, fontWeight: 600,
          color: "rgba(255,255,255,0.4)",
          cursor: "pointer", transition: "all 0.12s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
        }}
        onMouseEnter={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(255,255,255,0.07)"; b.style.color = "rgba(255,255,255,0.65)"; }}
        onMouseLeave={(e) => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(255,255,255,0.04)"; b.style.color = "rgba(255,255,255,0.4)"; }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        Add contact
      </button>

      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 50,
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
            padding: "0 0 0 0",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            style={{
              width: "100%", maxWidth: 400,
              background: "#1e2029",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: "16px 16px 0 0",
              padding: "20px 20px 32px",
              boxShadow: "0 -12px 48px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.9)", margin: 0 }}>Add contact</h2>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", margin: "3px 0 0" }}>Start a new conversation</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 6, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}
              >
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {availableCharacters.length === 0 ? (
              <>
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.09)", borderRadius: 8, padding: "12px", fontSize: 11, color: "rgba(255,255,255,0.28)", textAlign: "center" }}>
                  No characters left to add.
                </div>
                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                  <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", fontSize: 11, color: "rgba(255,255,255,0.4)", cursor: "pointer" }}>Close</button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 6 }}>Character</div>
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 8, padding: "10px 12px",
                    fontSize: 12, color: "rgba(255,255,255,0.8)",
                    outline: "none", cursor: "pointer",
                  }}
                >
                  <option value="" style={{ background: "#1e2029" }}>Select character…</option>
                  {availableCharacters.map((c) => (
                    <option key={c.id} value={c.id} style={{ background: "#1e2029" }}>
                      {c.name}{c.title ? ` — ${c.title}` : ""}
                    </option>
                  ))}
                </select>

                <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                  <form action="/chat/start" method="POST" style={{ flex: 1 }}>
                    <input type="hidden" name="contactCharacterId" value={selected} />
                    <button
                      type="submit"
                      disabled={!selected}
                      style={{
                        width: "100%", background: selected ? "#3d7fff" : "rgba(255,255,255,0.08)",
                        border: "none", borderRadius: 8,
                        padding: "10px", fontSize: 11, fontWeight: 700,
                        color: selected ? "#fff" : "rgba(255,255,255,0.25)",
                        cursor: selected ? "pointer" : "not-allowed",
                        transition: "all 0.12s",
                      }}
                    >
                      Open conversation
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    style={{ background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "rgba(255,255,255,0.4)", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}