import Link from "next/link";
import { listEvents } from "@/lib/admin/events";

export default async function AdminEventsPage() {
  const events = await listEvents();

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#2a313d]">Events</h1>
          <p className="mt-1 text-sm text-[#677388]">
            Manage live world events that characters can reference in chat.
          </p>
        </div>

        <Link
          href="/admin/events/new"
          className="rounded-xl bg-[#2a313d] px-5 py-3 font-semibold text-white"
        >
          Create Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/10 p-4 text-[#677388]">
          No events yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/10">
          <table className="w-full border-collapse">
            <thead className="bg-[#f8fafc] text-left">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-[#2a313d]">
                  Title
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-[#2a313d]">
                  Status
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-[#2a313d]">
                  Importance
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-[#2a313d]">
                  Region
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-[#2a313d]">
                  Faction
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-[#2a313d]">
                  Affected
                </th>
                <th className="px-4 py-3 text-sm font-semibold text-[#2a313d]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id} className="border-t border-black/10">
                  <td className="px-4 py-3 text-[#2a313d]">{event.title}</td>
                  <td className="px-4 py-3 text-[#677388]">{event.status}</td>
                  <td className="px-4 py-3 text-[#677388]">
                    {event.importance}
                  </td>
                  <td className="px-4 py-3 text-[#677388]">
                    {event.region ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[#677388]">
                    {event.faction ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[#677388]">
                    {event.affected_character_keys?.length
                      ? event.affected_character_keys.join(", ")
                      : "Global"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/events/${event.id}`}
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