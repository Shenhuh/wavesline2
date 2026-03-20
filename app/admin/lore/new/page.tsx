import { redirect } from "next/navigation";
import { createLoreEntry } from "@/lib/admin/lore";

async function createLoreEntryAction(formData: FormData) {
  "use server";
  await createLoreEntry(formData);
  redirect("/admin/lore");
}

export default function AdminNewLorePage() {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#2a313d]">Create Lore Entry</h1>
        <p className="mt-1 text-sm text-[#677388]">
          Add a lore entry using only a key and content.
        </p>
      </div>

      <form action={createLoreEntryAction} className="space-y-6">
        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
            Key
          </label>
          <input
            name="key"
            required
            placeholder="WORLD_LORE"
            className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
          />
          <p className="mt-2 text-xs text-[#677388]">
            Will be normalized to uppercase with underscores.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
            Content
          </label>
          <textarea
            name="content"
            className="min-h-[340px] w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
          />
        </div>

        <button
          type="submit"
          className="rounded-xl bg-[#2a313d] px-5 py-3 font-semibold text-white"
        >
          Save Lore Entry
        </button>
      </form>
    </div>
  );
}