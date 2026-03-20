"use client";

import { useState } from "react";

export type StickerOption = {
  id: string;
  key: string;
  label: string;
  image_path: string;
};

export default function StickerPicker({
  stickers,
  onPick,
  disabled = false,
}: {
  stickers: StickerOption[];
  onPick: (stickerId: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (stickers.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="rounded-xl border border-black/10 px-4 py-3 font-semibold text-[#2a313d] disabled:opacity-50"
      >
        Sticker
      </button>

      {open ? (
        <div className="absolute bottom-14 left-0 z-30 w-[320px] rounded-2xl border border-black/10 bg-white p-3 shadow-xl">
          <div className="mb-2 text-sm font-semibold text-[#2a313d]">Stickers</div>

          <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto">
            {stickers.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                onClick={() => {
                  onPick(sticker.id);
                  setOpen(false);
                }}
                className="rounded-xl border border-black/10 p-2 hover:bg-[#f8fafc]"
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
      ) : null}
    </div>
  );
}