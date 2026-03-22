"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

export type GifOption = {
  id: string;
  title: string;
  url: string;
  preview: string;
  width: number;
  height: number;
  searchQuery?: string;
};

export default function GifPicker({
  onPick,
  disabled = false,
}: {
  onPick: (gif: GifOption) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<GifOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ bottom: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const btnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSearchRef = useRef("");
  const searchSeqRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const search = useCallback(async (rawQuery: string) => {
    const trimmed = rawQuery.trim();
    activeSearchRef.current = trimmed;

    if (!trimmed) {
      setGifs([]);
      setLoading(false);
      return;
    }

    const seq = ++searchSeqRef.current;
    setLoading(true);

    try {
      const res = await fetch(
        `/api/giphy/search?q=${encodeURIComponent(trimmed)}&limit=20`
      );
      const data = await res.json();

      if (seq !== searchSeqRef.current) return;

      const results = Array.isArray(data?.gifs) ? data.gifs : [];

      setGifs(
        results.map((gif: any) => ({
          ...gif,
          searchQuery: trimmed,
        }))
      );
    } catch {
      if (seq !== searchSeqRef.current) return;
      setGifs([]);
    } finally {
      if (seq === searchSeqRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();

    if (!trimmed) {
      setLoading(false);
      setGifs([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      void search(trimmed);
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  function openPicker() {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPopoverPos({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
      });
    }

    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function closePicker() {
    setOpen(false);
  }

  function handlePick(gif: GifOption) {
    const finalQuery =
      gif.searchQuery?.trim() || activeSearchRef.current.trim() || query.trim() || undefined;

    onPick({
      ...gif,
      searchQuery: finalQuery,
    });

    closePicker();
    setQuery("");
    setGifs([]);
    setLoading(false);
    activeSearchRef.current = "";
  }

  const desktopPopover = open && popoverPos && (
    <div
      className="hidden sm:block fixed z-[999] rounded-xl"
      style={{
        bottom: popoverPos.bottom,
        left: popoverPos.left,
        width: 300,
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.1)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
      }}
    >
      <div className="p-3 border-b border-black/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#23252f]/40">
            GIFs
          </span>
          <button
            type="button"
            onClick={closePicker}
            className="text-[#23252f]/30 hover:text-[#23252f]/60 p-1"
          >
            <svg width="12" height="12" viewBox="0 0 13 13" fill="none">
              <path
                d="M2 2L11 11M11 2L2 11"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          className="w-full rounded-lg px-3 py-2 text-sm text-[#23252f] outline-none"
          style={{
            background: "#f6f7f9",
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        />
      </div>

      <div className="overflow-y-auto p-2" style={{ maxHeight: 260 }}>
        {loading && (
          <div className="flex justify-center py-6 text-xs text-[#23252f]/30">
            Searching…
          </div>
        )}

        {!loading && gifs.length === 0 && query.trim() && (
          <div className="flex justify-center py-6 text-xs text-[#23252f]/30">
            No results
          </div>
        )}

        {!loading && gifs.length === 0 && !query.trim() && (
          <div className="flex justify-center py-6 text-xs text-[#23252f]/30">
            Type to search
          </div>
        )}

        <div className="grid grid-cols-2 gap-1.5">
          {gifs.map((gif) => (
            <button
              key={gif.id}
              type="button"
              onClick={() => handlePick(gif)}
              className="rounded-lg overflow-hidden transition-opacity hover:opacity-80"
              title={gif.title}
            >
              <img
                src={gif.preview}
                alt={gif.title}
                className="w-full object-cover"
                style={{ height: 90 }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="fixed inset-0 -z-10" onMouseDown={closePicker} />
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
        className="w-full rounded-t-2xl"
        style={{
          background: "#ffffff",
          boxShadow: "0 -4px 32px rgba(0,0,0,0.18)",
          maxHeight: "70vh",
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-black/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#23252f]/40">
              GIFs
            </span>
            <button
              type="button"
              onClick={closePicker}
              className="p-1.5 text-[#23252f]/30 hover:text-[#23252f]/60"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path
                  d="M2 2L11 11M11 2L2 11"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs..."
            className="w-full rounded-xl px-4 py-2.5 text-sm text-[#23252f] outline-none"
            style={{
              background: "#f6f7f9",
              border: "1px solid rgba(0,0,0,0.08)",
            }}
          />
        </div>

        <div
          className="overflow-y-auto p-3 pb-8"
          style={{ maxHeight: "calc(70vh - 100px)" }}
        >
          {loading && (
            <div className="flex justify-center py-6 text-xs text-[#23252f]/30">
              Searching…
            </div>
          )}

          {!loading && gifs.length === 0 && query.trim() && (
            <div className="flex justify-center py-6 text-xs text-[#23252f]/30">
              No results
            </div>
          )}

          {!loading && gifs.length === 0 && !query.trim() && (
            <div className="flex justify-center py-6 text-xs text-[#23252f]/30">
              Type to search
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                type="button"
                onClick={() => handlePick(gif)}
                className="rounded-xl overflow-hidden transition-opacity active:opacity-70"
                title={gif.title}
              >
                <img
                  src={gif.preview}
                  alt={gif.title}
                  className="w-full object-cover"
                  style={{ height: 100 }}
                />
              </button>
            ))}
          </div>
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
        title="GIFs"
        className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:opacity-40"
        style={{
          background: open ? "#23252f" : "#e2e3e8",
          color: open ? "#ffffff" : "#5a5c6a",
          border: "1px solid rgba(0,0,0,0.1)",
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "-0.5px" }}>
          GIF
        </span>
      </button>

      {mounted &&
        createPortal(<>{desktopPopover}{mobileSheet}</>, document.body)}
    </>
  );
}