"use client";

import { useEffect, useRef, useState } from "react";
import ActiveCharacterSelect from "./ActiveCharacterSelect";

type CharacterOption = { id: string; name: string };

export default function SettingsMenu({
  activeCharacterId,
  allCharacters,
  changeActiveCharacterAction,
  signOutAction,
}: {
  activeCharacterId: string;
  allCharacters: CharacterOption[];
  changeActiveCharacterAction: (formData: FormData) => void | Promise<void>;
  signOutAction: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }}>
      <button
        type="button"
        title="Settings"
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, cursor: "pointer", background: "none", border: "none", padding: 0 }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="2" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
          <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06"
            stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: 32, zIndex: 50,
          width: 210, borderRadius: 12,
          background: "#1e2029",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
          padding: "10px 10px 8px",
        }}>
          {/* Playing as label */}
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(255,255,255,0.22)", marginBottom: 6, paddingLeft: 2 }}>
            Playing as
          </div>

          <form action={async (fd) => { await changeActiveCharacterAction(fd); setOpen(false); }}>
            <ActiveCharacterSelect defaultValue={activeCharacterId} options={allCharacters} />
          </form>

          <div style={{ marginTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 6 }}>
            <form action={async (fd) => { await signOutAction(fd); setOpen(false); }}>
              <button
                type="submit"
                style={{
                  width: "100%", textAlign: "left", background: "none", border: "none",
                  padding: "5px 6px", borderRadius: 6,
                  fontSize: 11, color: "rgba(255,255,255,0.45)",
                  cursor: "pointer", transition: "all 0.12s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.75)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.45)"; }}
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}