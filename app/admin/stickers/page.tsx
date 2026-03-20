import Link from "next/link";
import { listAdminStickers } from "@/lib/admin/stickers";

export default async function AdminStickersPage() {
  const stickers = await listAdminStickers();

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2a313d]">Stickers</h1>
          <p className="mt-1 text-sm text-[#677388]">
            Manage chat stickers.
          </p>
        </div>

        <Link
          href="/admin/stickers/new"
          className="rounded-xl bg-[#2a313d] px-5 py-3 font-semibold text-white"
        >
          Create Sticker
        </Link>
      </div>

      {stickers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/10 p-4 text-[#677388]">
          No stickers yet.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {stickers.map((sticker) => (
            <Link
              key={sticker.id}
              href={`/admin/stickers/${sticker.id}`}
              className="rounded-2xl border border-black/10 bg-[#f8fafc] p-4"
            >
              <img
                src={sticker.image_path}
                alt={sticker.label}
                className="mb-3 h-24 w-24 object-contain"
              />
              <div className="font-semibold text-[#2a313d]">{sticker.label}</div>
              <div className="text-sm text-[#677388]">{sticker.key}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}