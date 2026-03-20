import { notFound, redirect } from "next/navigation";
import {
  deleteAdminSticker,
  getAdminStickerById,
  updateAdminSticker,
} from "@/lib/admin/stickers";

async function updateStickerAction(formData: FormData) {
  "use server";
  await updateAdminSticker(formData);
  const id = String(formData.get("id") ?? "");
  redirect(`/admin/stickers/${id}`);
}

async function deleteStickerAction(formData: FormData) {
  "use server";
  await deleteAdminSticker(formData);
  redirect("/admin/stickers");
}

export default async function AdminEditStickerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sticker = await getAdminStickerById(id);

  if (!sticker) notFound();

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
      <h1 className="text-3xl font-bold text-[#2a313d]">Edit Sticker</h1>
      <p className="mt-1 text-sm text-[#677388]">Update sticker data.</p>

      <form action={updateStickerAction} className="mt-6 space-y-5">
        <input type="hidden" name="id" value={sticker.id} />

        <Field label="Key" name="key" defaultValue={sticker.key} />
        <Field label="Label" name="label" defaultValue={sticker.label} />
        <Field
          label="Sort Order"
          name="sort_order"
          type="number"
          defaultValue={String(sticker.sort_order ?? 0)}
        />

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
            Replace Sticker Image
          </label>
          <input
            name="image_file"
            type="file"
            accept="image/*"
            className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-[#232833] file:px-3 file:py-2 file:text-white"
          />
          <img
            src={sticker.image_path}
            alt={sticker.label}
            className="mt-3 h-24 w-24 object-contain"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
            AI Triggers
          </label>
          <textarea
            name="ai_triggers"
            rows={6}
            defaultValue={(sticker.ai_triggers ?? []).join("\n")}
            className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
          />
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-black/10 px-4 py-3">
          <input
            type="checkbox"
            name="ai_enabled"
            defaultChecked={sticker.ai_enabled}
          />
          <span className="text-sm font-semibold text-[#2a313d]">
            Allow AI to use this sticker
          </span>
        </label>

        <button
          type="submit"
          className="rounded-xl bg-[#2a313d] px-5 py-3 font-semibold text-white"
        >
          Save Changes
        </button>
      </form>

      <div className="mt-8 border-t border-black/10 pt-6">
        <form action={deleteStickerAction}>
          <input type="hidden" name="id" value={sticker.id} />
          <button
            type="submit"
            className="rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-600"
          >
            Delete Sticker
          </button>
        </form>
      </div>
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