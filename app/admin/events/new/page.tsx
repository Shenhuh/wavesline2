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
              Status
            </label>
            <select
              name="status"
              defaultValue="active"
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            >
              <option value="upcoming">upcoming</option>
              <option value="active">active</option>
              <option value="ended">ended</option>
            </select>
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

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Region
            </label>
            <input
              name="region"
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Faction
            </label>
            <input
              name="faction"
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Starts At
            </label>
            <input
              name="starts_at"
              type="datetime-local"
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Ends At
            </label>
            <input
              name="ends_at"
              type="datetime-local"
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
            Summary
          </label>
          <textarea
            name="summary"
            required
            className="min-h-[120px] w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
            Details
          </label>
          <textarea
            name="details"
            className="min-h-[140px] w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
            Affected Character Keys
          </label>
          <p className="mb-2 text-xs text-[#677388]">
            One character key per line. Leave empty to make the event global.
          </p>
          <textarea
            name="affected_character_keys"
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