import { redirect } from "next/navigation";
import { createMonster } from "@/lib/admin/monsters";

async function createMonsterAction(formData: FormData) {
  "use server";
  await createMonster(formData);
  redirect("/admin/monsters");
}

export default function AdminNewMonsterPage() {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#2a313d]">Create Monster</h1>
        <p className="mt-1 text-sm text-[#677388]">
          Add a monster record for chat retrieval.
        </p>
      </div>

      <form action={createMonsterAction} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Name
            </label>
            <input
              name="name"
              required
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Element
            </label>
            <input
              name="element"
              placeholder="Havoc, Aero, Electro..."
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Class
            </label>
            <input
              name="class"
              placeholder="Common, Elite, Overlord, Calamity..."
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Location
            </label>
            <input
              name="location"
              placeholder="Rinascita, Huanglong..."
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
            className="min-h-[280px] w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
          />
        </div>

        <button
          type="submit"
          className="rounded-xl bg-[#2a313d] px-5 py-3 font-semibold text-white"
        >
          Save Monster
        </button>
      </form>
    </div>
  );
}