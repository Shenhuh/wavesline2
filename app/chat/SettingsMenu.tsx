"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import ActiveCharacterSelect from "./ActiveCharacterSelect";

type CharacterOption = {
  id: string;
  name: string;
};

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
    function onClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        className="flex h-6 w-6 items-center justify-center"
        title="Settings"
        type="button"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle
            cx="7"
            cy="7"
            r="2"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.2"
          />
          <path
            d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-8 z-50 w-[220px] rounded-xl border border-white/10 bg-[#23252f] p-3 shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
          <div className="mb-2 text-[10px] uppercase tracking-widest text-white/25">
            Playing as
          </div>

          <form
            action={async (formData) => {
              await changeActiveCharacterAction(formData);
              setOpen(false);
            }}
          >
            <ActiveCharacterSelect
              defaultValue={activeCharacterId}
              options={allCharacters}
            />
          </form>

          <div className="mt-3 border-t border-white/10 pt-3">
       

            <form
              action={async (formData) => {
                await signOutAction(formData);
                setOpen(false);
              }}
            >
              <button
                type="submit"
                className="mt-1 block w-full rounded-md px-2 py-2 text-left text-[12px] text-white/55 transition hover:bg-white/[0.05] hover:text-white/80"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}