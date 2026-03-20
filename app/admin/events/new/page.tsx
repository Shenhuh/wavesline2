import { redirect } from "next/navigation";
import { createEvent } from "@/lib/admin/events";

async function createEventAction(formData: FormData) {
  "use server";
  await createEvent(formData);
  redirect("/admin/events");
}

export default function AdminNewEventPage() {
  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#2a313d]">Create Event</h1>
        <p className="mt-1 text-sm text-[#677388]">
          Add a world event that can influence character replies.
        </p>
      </div>

      <form action={createEventAction} className="space-y-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Title
            </label>
            <input
              name="title"
              required
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Slug
            </label>
            <input
              name="slug"
              placeholder="optional-auto-generated"
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Order
            </label>
            <input
              name="order"
              type="number"
              defaultValue={0}
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Importance
            </label>
            <input
              name="importance"
              type="number"
              defaultValue={1}
              min={1}
              max={10}
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
            Details
          </label>
          <textarea
            name="details"
            className="min-h-[160px] w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
            Involved Characters
          </label>
          <p className="mb-2 text-xs text-[#677388]">
            One character key per line. Leave empty if the event is not tied to
            specific characters.
          </p>
          <textarea
            name="involved_characters"
            className="min-h-[120px] w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
          />
        </div>

        <button
          type="submit"
          className="rounded-xl bg-[#2a313d] px-5 py-3 font-semibold text-white"
        >
          Save Event
        </button>
      </form>
    </div>
  );
}