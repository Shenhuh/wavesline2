import Link from "next/link";
import { listMonsters } from "@/lib/admin/monsters";

export default async function AdminMonstersPage() {
  const monsters = await listMonsters();

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2a313d]">Monsters</h1>
          <p className="mt-1 text-sm text-[#677388]">
            Manage monster records used for factual retrieval in chat.
          </p>
        </div>

        <Link
          href="/admin/monsters/new"
          className="rounded-xl bg-[#2a313d] px-5 py-3 font-semibold text-white"
        >
          Create Monster
        </Link>
      </div>

      {monsters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/10 p-4 text-[#677388]">
          No monsters yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/10">
          <table className="w-full border-collapse">
            <thead className="bg-[#f8fafc] text-left">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-[#2a313d]">
                  Name
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-[#2a313d]">
                  Element
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-[#2a313d]">
                  Class
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-[#2a313d]">
                  Location
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
              {monsters.map((monster) => (
                <tr key={monster.id} className="border-t border-black/10">
                  <td className="px-4 py-3 font-medium text-[#2a313d]">
                    {monster.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#677388]">
                    {monster.element ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#677388]">
                    {monster.class ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#677388]">
                    {monster.location ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-[#677388]">
                    {monster.updated_at
                      ? new Date(monster.updated_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/monsters/${monster.id}`}
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