"use client";

import { useState } from "react";

type ContactOption = { id: string; name: string; title?: string | null; key: string };

export default function AddContactModal({ availableCharacters }: { availableCharacters: ContactOption[] }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="w-full rounded px-3 py-2 text-xs font-semibold text-white/60 transition-all hover:bg-white/[0.07] hover:text-white/80"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
        + Add Contact
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" style={{ backdropFilter: "blur(4px)" }}>
          <div className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-xl p-5"
            style={{ background: "#23252f", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight text-white/90">Add Contact</h2>
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-white/30 hover:text-white/70">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <p className="mb-4 text-xs text-white/35">Choose a character to start a new conversation.</p>
            {availableCharacters.length === 0 ? (
              <>
                <div className="rounded px-3 py-3 text-xs text-white/30" style={{ background: "rgba(255,255,255,0.04)", border: "1px dashed rgba(255,255,255,0.1)" }}>No characters left to add.</div>
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={() => setOpen(false)} className="rounded px-4 py-2 text-xs font-semibold text-white/50 hover:text-white/80">Close</button>
                </div>
              </>
            ) : (
              <>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-white/30">Character</label>
                <select value={selected} onChange={(e) => setSelected(e.target.value)}
                  className="w-full rounded px-3 py-3 text-sm text-white/80 outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <option value="" style={{ background: "#2a2c35" }}>Select character</option>
                  {availableCharacters.map((c) => (
                    <option key={c.id} value={c.id} style={{ background: "#2a2c35" }}>{c.name}{c.title ? ` — ${c.title}` : ""}</option>
                  ))}
                </select>
                <div className="mt-4 flex gap-2">
                  <form action="/chat/start" method="POST" className="flex-1">
                    <input type="hidden" name="contactCharacterId" value={selected} />
                    <button type="submit" disabled={!selected}
                      className="w-full rounded py-3 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-30"
                      style={{ background: "#3d404e" }}>
                      Open Conversation
                    </button>
                  </form>
                  <button type="button" onClick={() => setOpen(false)} className="rounded px-4 py-3 text-xs font-semibold text-white/40 hover:text-white/70">Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}