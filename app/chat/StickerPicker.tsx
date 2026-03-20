"use client";

import { useState } from "react";

export type StickerOption = { id: string; key: string; label: string; image_path: string };

export default function StickerPicker({ stickers, onPick, disabled = false }: { stickers: StickerOption[]; onPick: (id: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  if (stickers.length === 0) return null;

  return (
    <div className="relative">
      <button type="button" disabled={disabled} onClick={() => setOpen((v) => !v)} title="Stickers"
        className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded text-[#23252f]/40 transition-all hover:bg-black/[0.06] hover:text-[#23252f]/70 disabled:opacity-40"
        style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.1)" }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
          <circle cx="5.5" cy="7" r="0.9" fill="currentColor"/>
          <circle cx="10.5" cy="7" r="0.9" fill="currentColor"/>
          <path d="M5.5 10C6 11.2 6.8 11.8 8 11.8C9.2 11.8 10 11.2 10.5 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        /* On mobile: bottom sheet. On sm+: popover above button */
        <div className="fixed sm:absolute inset-x-0 sm:inset-x-auto bottom-0 sm:bottom-12 left-0 z-30 sm:w-[280px] rounded-t-2xl sm:rounded-xl p-3 sm:p-3"
          style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.1)", boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#23252f]/40">Stickers</span>
            <button type="button" onClick={() => setOpen(false)} className="text-[#23252f]/30 hover:text-[#23252f]/60">
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path d="M2 2L11 11M11 2L2 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-4 max-h-48 sm:max-h-56 gap-1.5 overflow-y-auto">
            {stickers.map((sticker) => (
              <button key={sticker.id} type="button" onClick={() => { onPick(sticker.id); setOpen(false); }}
                className="rounded p-1.5 transition-colors hover:bg-[#f0f1f4] active:bg-[#e8e9ed]" title={sticker.label}>
                <img src={sticker.image_path} alt={sticker.label} className="h-12 w-12 sm:h-14 sm:w-14 object-contain" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}