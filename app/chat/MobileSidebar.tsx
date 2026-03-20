"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AddContactModal from "./AddContactModal";
import ThreadList from "./ThreadList";

type ThreadItem = {
  id: string;
  contact_character_id: string;
  lastMessageAt?: string | null;
  contact?: {
    id: string;
    name: string;
    title: string | null;
    key: string;
    avatar?: string | null;
  } | null;
};

type CharacterOption = {
  id: string;
  name: string;
};

type AvailableCharacter = {
  id: string;
  name: string;
  title?: string | null;
  key: string;
};

function Avatar({
  src,
  name,
  size = 34,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-[#3a3d4a] font-semibold text-white/60"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initial}
    </div>
  );
}

export default function MobileSidebar({
  activeCharacterId,
  activeCharacterName,
  allCharacters,
  threads,
  currentThreadId,
  availableCharacters,
}: {
  activeCharacterId: string;
  activeCharacterName: string;
  allCharacters: CharacterOption[];
  threads: ThreadItem[];
  currentThreadId?: string | null;
  availableCharacters: AvailableCharacter[];
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onClickOutside(e: MouseEvent) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10"
        title="Open sidebar"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M2 3.25H12M2 7H12M2 10.75H12"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/45 sm:hidden">
          <div
            ref={panelRef}
            className="flex h-full w-[280px] flex-col border-r border-white/10 bg-[#23252f] shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-white/10">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <rect
                      x="1"
                      y="2.5"
                      width="10"
                      height="7"
                      rx="1.5"
                      stroke="rgba(255,255,255,0.6)"
                      strokeWidth="1.1"
                    />
                    <path
                      d="M1 4L6 7.5L11 4"
                      stroke="rgba(255,255,255,0.6)"
                      strokeWidth="1.1"
                    />
                  </svg>
                </div>
                <span className="text-[11px] font-semibold tracking-wide text-white/60">
                  WavesLine
                </span>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-white/10"
                title="Close"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M1 1L11 11M11 1L1 11"
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="border-b border-white/10 px-4 py-3">
              <div className="text-[9px] uppercase tracking-widest text-white/25">
                Playing as
              </div>
              <div className="mt-1 text-sm font-semibold text-white/80">
                {activeCharacterName}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {threads.length === 0 ? (
                <div className="px-4 py-3 text-xs text-white/25">
                  No conversations yet.
                </div>
              ) : (
                <ThreadList threads={threads} currentThreadId={currentThreadId} />
              )}
            </div>

            <div className="border-t border-white/10 p-3">
              <AddContactModal availableCharacters={availableCharacters} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}