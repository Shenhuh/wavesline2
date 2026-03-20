import Link from "next/link";
import { listLoreEntries } from "@/lib/admin/lore";

export default async function AdminLorePage() {
  const loreEntries = await listLoreEntries();

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2a313d]">Lore</h1>
          <p className="mt-1 text-sm text-[#677388]">
            Manage simple lore entries by key and content.
          </p>
        </div>

        <Link
          href="/admin/lore/new"
          className="rounded-xl bg-[#2a313d] px-5 py-3 font-semibold text-white"
        >
          Create Lore Entry
        </Link>
      </div>

      {loreEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/10 p-4 text-[#677388]">
          No lore entries yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-black/10">
          <table className="w-full border-collapse">
            <thead className="bg-[#f8fafc] text-left">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-[#2a313d]">
                  Key
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-[#2a313d]">
                  Content Preview
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-[#2a313d]">
                  Updated
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-[#2a313d]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loreEntries.map((entry) => (
                <tr key={entry.key} className="border-t border-black/10">
                  <td className="px-4 py-3 font-medium text-[#2a313d]">
                    {entry.key}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#677388]">
                    {(entry.content ?? "").slice(0, 120)}
                    {(entry.content ?? "").length > 120 ? "..." : ""}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#677388]">
                    {entry.updated_at
                      ? new Date(entry.updated_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/lore/${encodeURIComponent(entry.key)}`}
                      className="font-semibold text-[#2a313d]"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}