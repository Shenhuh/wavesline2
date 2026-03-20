"use client";

import { useEffect, useRef, useState } from "react";

type CharacterOption = {
  id: string;
  name: string;
  title: string | null;
  avatar: string | null;
};

function Avatar({
  src,
  name,
  size = 44,
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
      className="flex items-center justify-center rounded-full bg-[#232833] font-semibold text-white"
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}

export default function CharacterSelectDropdown({
  name,
  options,
  defaultValue,
}: {
  name: string;
  options: CharacterOption[];
  defaultValue?: string;
}) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const initial =
    options.find((option) => option.id === defaultValue) ?? options[0] ?? null;

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<CharacterOption | null>(initial);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!selected) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white px-4 py-4 text-[#677388]">
        No characters available.
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input type="hidden" name={name} value={selected.id} />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl border border-black/10 bg-white px-4 py-4 text-left"
      >
        <div className="flex min-w-0 items-center gap-4">
          <Avatar src={selected.avatar} name={selected.name} size={50} />

          <div className="min-w-0">
            <div className="truncate text-lg font-semibold text-[#22304a]">
              {selected.name}
            </div>
            <div className="truncate text-sm text-[#5f6f87]">
              {selected.title ?? ""}
            </div>
          </div>
        </div>

        <div className="ml-4 text-[#677388]">{open ? "▲" : "▼"}</div>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-black/10 bg-white p-2 shadow-xl">
          {options.map((option) => {
            const isActive = selected.id === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  setSelected(option);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left ${
                  isActive ? "bg-[#eef2f7]" : "hover:bg-[#f8fafc]"
                }`}
              >
                <Avatar src={option.avatar} name={option.name} size={42} />

                <div className="min-w-0">
                  <div className="truncate font-semibold text-[#22304a]">
                    {option.name}
                  </div>
                  <div className="truncate text-sm text-[#5f6f87]">
                    {option.title ?? ""}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}