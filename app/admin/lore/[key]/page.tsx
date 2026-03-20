import { notFound, redirect } from "next/navigation";
import {
  deleteLoreEntry,
  getLoreEntryByKey,
  updateLoreEntry,
} from "@/lib/admin/lore";

async function updateLoreEntryAction(formData: FormData) {
  "use server";
  const nextKey = await updateLoreEntry(formData);
  redirect(`/admin/lore/${encodeURIComponent(nextKey)}`);
}

async function deleteLoreEntryAction(formData: FormData) {
  "use server";
  await deleteLoreEntry(formData);
  redirect("/admin/lore");
}

export default async function AdminEditLorePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const decodedKey = decodeURIComponent(key);
  const entry = await getLoreEntryByKey(decodedKey);

  if (!entry) notFound();

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#2a313d]">Edit Lore Entry</h1>
        <p className="mt-1 text-sm text-[#677388]">
          Update this lore entry’s key or content.
        </p>
      </div>

      <form action={updateLoreEntryAction} className="space-y-6">
        <input type="hidden" name="original_key" value={entry.key} />

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
            Key
          </label>
          <input
            name="key"
            required
            defaultValue={entry.key}
            className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
            Content
          </label>
          <textarea
            name="content"
            defaultValue={entry.content ?? ""}
            className="min-h-[340px] w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
          />
        </div>

        <button
          type="submit"
          className="rounded-xl bg-[#2a313d] px-5 py-3 font-semibold text-white"
        >
          Save Changes
        </button>
      </form>

      <div className="mt-8 border-t border-black/10 pt-6">
        <form action={deleteLoreEntryAction}>
          <input type="hidden" name="key" value={entry.key} />
          <button
            type="submit"
            className="rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-600"
          >
            Delete Lore Entry
          </button>
        </form>
      </div>
    </div>
  );
}