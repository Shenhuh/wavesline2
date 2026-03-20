import { notFound, redirect } from "next/navigation";
import { deleteEvent, getEventById, updateEvent } from "@/lib/admin/events";

async function updateEventAction(formData: FormData) {
  "use server";
  await updateEvent(formData);
  const id = String(formData.get("id") ?? "");
  redirect(`/admin/events/${id}`);
}

async function deleteEventAction(formData: FormData) {
  "use server";
  await deleteEvent(formData);
  redirect("/admin/events");
}

export default async function AdminEditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventById(id);

  if (!event) notFound();

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#2a313d]">Edit Event</h1>
        <p className="mt-1 text-sm text-[#677388]">
          Update this event and how it influences the world.
        </p>
      </div>

      <form action={updateEventAction} className="space-y-6">
        <input type="hidden" name="id" value={event.id} />

        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Title
            </label>
            <input
              name="title"
              required
              defaultValue={event.title}
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Slug
            </label>
            <input
              name="slug"
              defaultValue={event.slug ?? ""}
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Status
            </label>
            <select
              name="status"
              defaultValue={event.status}
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
              min={1}
              max={10}
              defaultValue={event.importance}
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Region
            </label>
            <input
              name="region"
              defaultValue={event.region ?? ""}
              className="w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
              Faction
            </label>
            <input
              name="faction"
              defaultValue={event.faction ?? ""}
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
              defaultValue={event.starts_at ? event.starts_at.slice(0, 16) : ""}
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
              defaultValue={event.ends_at ? event.ends_at.slice(0, 16) : ""}
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
            defaultValue={event.summary}
            className="min-h-[120px] w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
            Details
          </label>
          <textarea
            name="details"
            defaultValue={event.details ?? ""}
            className="min-h-[140px] w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-[#2a313d]">
            Affected Character Keys
          </label>
          <p className="mb-2 text-xs text-[#677388]">
            One character key per line.
          </p>
          <textarea
            name="affected_character_keys"
            defaultValue={(event.affected_character_keys ?? []).join("\n")}
            className="min-h-[120px] w-full rounded-xl border border-black/10 px-4 py-3 outline-none"
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
        <form action={deleteEventAction}>
          <input type="hidden" name="id" value={event.id} />
          <button
            type="submit"
            className="rounded-xl border border-red-300 px-5 py-3 font-semibold text-red-600"
          >
            Delete Event
          </button>
        </form>
      </div>
    </div>
  );
}