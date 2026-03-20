"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "wavesline_info_modal_hidden_v1";

export default function InfoModal() {
  const [open, setOpen] = useState(false);
  const [hideNextTime, setHideNextTime] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);

    try {
      const hidden = window.localStorage.getItem(STORAGE_KEY);
      if (hidden !== "true") {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    function onMouseDown(event: MouseEvent) {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(event.target as Node)) {
        handleClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open, hideNextTime]);

  function handleClose() {
    if (hideNextTime) {
      try {
        window.localStorage.setItem(STORAGE_KEY, "true");
      } catch {}
    }
    setOpen(false);
  }

  function reopenModal() {
    setOpen(true);
  }

  if (!mounted) {
    return (
      <button
        className="flex h-6 w-6 items-center justify-center"
        title="Info"
        type="button"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle
            cx="7"
            cy="7"
            r="5.5"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.2"
          />
          <line
            x1="7"
            y1="6"
            x2="7"
            y2="10"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <circle cx="7" cy="4" r="0.7" fill="rgba(255,255,255,0.4)" />
        </svg>
      </button>
    );
  }

  return (
    <>
      <button
        className="flex h-6 w-6 items-center justify-center"
        title="Info"
        type="button"
        onClick={reopenModal}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle
            cx="7"
            cy="7"
            r="5.5"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.2"
          />
          <line
            x1="7"
            y1="6"
            x2="7"
            y2="10"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <circle cx="7" cy="4" r="0.7" fill="rgba(255,255,255,0.4)" />
        </svg>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4 py-6">
          <div
            ref={panelRef}
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#23252f] shadow-[0_18px_60px_rgba(0,0,0,0.5)]"
            style={{ fontFamily: "var(--font-lagu)" }}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold tracking-wide text-white/90">
                  About WavesLine
                </h2>
                <p className="mt-1 text-[11px] text-white/35">
                  Fan-made chatbot project information
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white/80"
                title="Close"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M1 1L11 11M11 1L1 11"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="max-h-[70svh] overflow-y-auto px-5 py-4 text-[12px] leading-6 text-white/72">
              <div className="space-y-4">
                <section>
                  <h3 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/35">
                    Disclaimer
                  </h3>
                  <p>
                    WavesLine is a fan-made website and chatbot project created
                    for entertainment, experimentation, and community purposes.
                    It is not official and is not affiliated with, endorsed by,
                    sponsored by, or connected to Kuro Games.
                  </p>
                </section>

                <section>
                  <h3 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/35">
                    Ownership
                  </h3>
                  <p>
                    I do not own Wuthering Waves, its characters, world,
                    terminology, official artwork, logos, names, or other
                    related intellectual property. All rights belong to Kuro
                    Games and their respective owners.
                  </p>
                </section>

                <section>
                  <h3 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/35">
                    Images and Assets
                  </h3>
                  <p>
                    Some images, character references, and other visual assets
                    used on this site may belong to Kuro Games or their
                    respective owners. They are used here for non-commercial
                    fan-project purposes only.
                  </p>
                </section>

                <section>
                  <h3 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/35">
                    AI Responses
                  </h3>
                  <p>
                    Character replies are AI-generated and may not always be
                    fully lore-accurate, official, or canonical. Responses are
                    part of a fan-made simulation experience.
                  </p>
                </section>

                <section>
                  <h3 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/35">
                    Fan Project Notice
                  </h3>
                  <p>
                    This project is intended as a fan experience and creative
                    chatbot interface. It is made for personal, community, or
                    showcase purposes, not as an official product or commercial
                    replacement for any official service.
                  </p>
                </section>

                <section>
                  <h3 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/35">
                    Takedown / Removal
                  </h3>
                  <p>
                    If any asset, material, or use of content on this site is
                    requested to be removed by the rightful owner or their
                    representative, the site or affected content should be taken
                    down or removed as soon as the developer has been notified.
                  </p>
                </section>

                <section>
                  <h3 className="mb-1 text-[11px] font-bold uppercase tracking-widest text-white/35">
                    Contact / Corrections
                  </h3>
                  <p>
                    If any asset or material used here should be credited,
                    corrected, changed, or removed, it should be updated by the
                    site owner accordingly.
                  </p>
                </section>
              </div>
            </div>

            <div className="border-t border-white/10 px-5 py-3">
              <label className="mb-3 flex items-center gap-2 text-[11px] text-white/55">
                <input
                  type="checkbox"
                  checked={hideNextTime}
                  onChange={(e) => setHideNextTime(e.target.checked)}
                  className="h-3.5 w-3.5 accent-white"
                />
                Do not show this again
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg bg-white/10 px-4 py-2 text-[12px] font-semibold text-white/80 transition hover:bg-white/15"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      window.localStorage.removeItem(STORAGE_KEY);
                    } catch {}
                    setHideNextTime(false);
                  }}
                  className="rounded-lg px-3 py-2 text-[11px] font-semibold text-white/45 transition hover:bg-white/10 hover:text-white/75"
                >
                  Reset popup preference
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}