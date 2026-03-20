"use client";

import { useState } from "react";

type ContactOption = {
  id: string;
  name: string;
  title?: string | null;
  key: string;
};

export default function AddContactModal({
  availableCharacters,
}: {
  availableCharacters: ContactOption[];
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl bg-[#2a313d] py-3 font-semibold text-white"
      >
        Add Contact
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-[#2a313d]">Add Contact</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-[#677388]"
              >
                Close
              </button>
            </div>

            <p className="mb-4 text-sm text-[#677388]">
              Choose a character to start a new conversation.
            </p>

            {availableCharacters.length === 0 ? (
              <>
                <div className="rounded-xl border border-dashed border-black/10 bg-[#f8fafc] px-4 py-4 text-sm text-[#677388]">
                  No characters left to add.
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-black/10 px-4 py-3 font-semibold text-[#2a313d]"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
                  Character
                </label>

                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  className="w-full rounded-xl border border-black/10 px-3 py-3 outline-none"
                >
                  <option value="">Select character</option>
                  {availableCharacters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                      {character.title ? ` — ${character.title}` : ""}
                    </option>
                  ))}
                </select>

                <div className="mt-5 flex gap-3">
                  <form action="/chat/start" method="POST" className="flex-1">
                    <input
                      type="hidden"
                      name="contactCharacterId"
                      value={selected}
                    />
                    <button
                      type="submit"
                      disabled={!selected}
                      className="w-full rounded-xl bg-[#2a313d] py-3 font-semibold text-white disabled:opacity-50"
                    >
                      Open Conversation
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-black/10 px-4 py-3 font-semibold text-[#2a313d]"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}