import { notFound, redirect } from "next/navigation";
import {
  deleteMonster,
  getMonsterById,
  updateMonster,
} from "@/lib/admin/monsters";

async function updateMonsterAction(formData: FormData) {
  "use server";
  await updateMonster(formData);
  const id = String(formData.get("id") ?? "");
  redirect(`/admin/monsters/${id}`);
}

async function deleteMonsterAction(formData: FormData) {
  "use server";
  await deleteMonster(formData);
  redirect("/admin/monsters");
}

export default async function AdminEditMonsterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const monster = await getMonsterById(id);

  if (!monster) notFound();

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#2a313d]">Edit Monster</h1>
        <p className="mt-1 text-sm text-[#677388]">
          Update monster data used by the chat system.
        </p>
      </div>

      <form action={updateMonsterAction} className="space-y-6">
        <input type="hidden" name="id" value={monster.id} />

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Name
            </label>
            <input
              name="name"
              required
              defaultValue={monster.name}
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Element
            </label>
            <input
              name="element"
              defaultValue={monster.element ?? ""}
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Class
            </label>
            <input
              name="class"
              defaultValue={monster.class ?? ""}
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Location
            </label>
            <input
              name="location"
              defaultValue={monster.location ?? ""}
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
            Lore
          </label>
          <textarea
            name="lore"
            defaultValue={monster.lore ?? ""}
            className="min-h-[280px] w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
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
        <form action={deleteMonsterAction}>
          <input type="hidden" name="id" value={monster.id} />
          <button
            type="submit"
            className="rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-600"
          >
            Delete Monster
          </button>
        </form>
      </div>
    </div>
  );
}