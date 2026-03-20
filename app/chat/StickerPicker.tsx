"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type StickerOption = { id: string; key: string; label: string; image_path: string };

export default function StickerPicker({
  stickers,
  onPick,
  disabled = false,
}: {
  stickers: StickerOption[];
  onPick: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ bottom: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  function openPicker() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPopoverPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
      });
    }
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
  }

  if (stickers.length === 0) return null;

  const desktopPopover = open && popoverPos && (
    <div
      className="hidden sm:block fixed z-[999] w-[260px] rounded-xl p-3"
      style={{
        bottom: popoverPos.bottom,
        left: popoverPos.left,
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.1)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
      }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#23252f]/40">
          Stickers
        </span>
        <button
          type="button"
          onClick={closePicker}
          className="text-[#23252f]/30 hover:text-[#23252f]/60 p-1"
        >
          <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
            <path d="M2 2L11 11M11 2L2 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5 overflow-y-auto" style={{ maxHeight: 220 }}>
        {stickers.map((sticker) => (
          <button
            key={sticker.id}
            type="button"
            onClick={() => { onPick(sticker.id); closePicker(); }}
            className="rounded-lg p-1.5 transition-colors hover:bg-[#f0f1f4] active:bg-[#e8e9ed]"
            title={sticker.label}
          >
            <img src={sticker.image_path} alt={sticker.label} className="h-14 w-14 object-contain" />
          </button>
        ))}
      </div>
      {/* Click-outside trap for desktop */}
      <div
        className="fixed inset-0 -z-10"
        onMouseDown={closePicker}
      />
    </div>
  );

  const mobileSheet = open && (
    <div
      className="sm:hidden fixed inset-0 z-[999] flex items-end"
      style={{ background: "rgba(0,0,0,0.35)" }}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) closePicker();
      }}
    >
      <div
        className="w-full rounded-t-2xl p-4 pb-8"
        style={{
          background: "#ffffff",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
          maxHeight: "65vh",
          overflowY: "auto",
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#23252f]/40">
            Stickers
          </span>
          <button
            type="button"
            onClick={closePicker}
            className="p-1.5 text-[#23252f]/30 hover:text-[#23252f]/60"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M2 2L11 11M11 2L2 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {stickers.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              onClick={() => { onPick(sticker.id); closePicker(); }}
              className="rounded-lg p-2 transition-colors active:bg-[#e8e9ed]"
              title={sticker.label}
            >
              <img
                src={sticker.image_path}
                alt={sticker.label}
                className="h-14 w-14 object-contain"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? closePicker() : openPicker())}
        title="Stickers"
        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:opacity-40"
        style={{
          background: open ? "#23252f" : "#e2e3e8",
          color: open ? "#ffffff" : "#5a5c6a",
          border: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <circle cx="5.5" cy="7" r="0.9" fill="currentColor" />
          <circle cx="10.5" cy="7" r="0.9" fill="currentColor" />
          <path
            d="M5.5 10C6 11.2 6.8 11.8 8 11.8C9.2 11.8 10 11.2 10.5 10"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Portal both overlays into document.body so no parent overflow can clip them */}
      {mounted && createPortal(
        <>
          {desktopPopover}
          {mobileSheet}
        </>,
        document.body
      )}
    </>
  );
}