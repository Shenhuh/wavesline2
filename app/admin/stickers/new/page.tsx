import { redirect } from "next/navigation";
import { createAdminSticker } from "@/lib/admin/stickers";

async function createStickerAction(formData: FormData) {
  "use server";
  await createAdminSticker(formData);
  redirect("/admin/stickers");
}

export default function AdminNewStickerPage() {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
      <h1 className="text-3xl font-bold text-[#2a313d]">Create Sticker</h1>
      <p className="mt-1 text-sm text-[#677388]">Add a sticker entry.</p>

      <form action={createStickerAction} className="mt-6 space-y-5">
        <Field label="Key" name="key" />
        <Field label="Label" name="label" />
        <Field label="Sort Order" name="sort_order" type="number" defaultValue="0" />

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
            Sticker Image
          </label>
          <input
            name="image_file"
            type="file"
            accept="image/*"
            className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-[#232833] file:px-3 file:py-2 file:text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
            AI Triggers
          </label>
          <textarea
            name="ai_triggers"
            rows={6}
            placeholder={`hello\nlove\ncry\nsad\napprove`}
            className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
          />
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-black/10 px-4 py-3">
          <input type="checkbox" name="ai_enabled" defaultChecked />
          <span className="text-sm font-semibold text-[#2a313d]">
            Allow AI to use this sticker
          </span>
        </label>

        <button
          type="submit"
          className="rounded-xl bg-[#2a313d] px-5 py-3 font-semibold text-white"
        >
          Save Sticker
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
        {label}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
      />
    </div>
  );
}