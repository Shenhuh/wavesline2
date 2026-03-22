// app/chat/page.tsx

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import {
  getCharacterById,
  getThreadForUser,
  getThreadRuntimeState,
  getUserActiveCharacterId,
  listCharacters,
  listMessages,
  listThreadsForUser,
} from "@/lib/chat/app-chat";
import { listStickers } from "@/lib/chat/stickers";
import {
  changeActiveCharacterAction,
  resetConversationAction,
} from "./actions";
import ActiveCharacterSelect from "./ActiveCharacterSelect";
import ChatMessagesClient from "./ChatMessagesClient";
import AddContactModal from "./AddContactModal";

function Avatar({
  src,
  name,
  size = 40,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-[#232833] font-semibold text-white"
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ thread?: string }>;
}) {
  const params = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const activeCharacterId = await getUserActiveCharacterId(user.id);
  if (!activeCharacterId) redirect("/select");

  const [activeCharacter, threads, allCharacters, stickers] = await Promise.all([
    getCharacterById(activeCharacterId),
    listThreadsForUser(user.id, activeCharacterId),
    listCharacters(),
    listStickers(),
  ]);

  if (!activeCharacter) redirect("/select");

  const currentThread = params.thread
    ? await getThreadForUser({
        userId: user.id,
        activeCharacterId,
        threadId: params.thread,
      })
    : threads[0] ?? null;

  const [messages, runtimeState, fullContactCharacter] = currentThread
    ? await Promise.all([
        listMessages(currentThread.id),
        getThreadRuntimeState(currentThread.id),
        currentThread.contact?.id
          ? getCharacterById(currentThread.contact.id)
          : Promise.resolve(null),
      ])
    : [[], null, null];

  const isBlocked = runtimeState?.blocked ?? false;
  const blockMessage = isBlocked
    ? fullContactCharacter?.block_message ?? "This conversation is over."
    : null;

  const existingContactIds = new Set(
    threads.map((thread) => thread.contact_character_id)
  );

  const availableCharactersToAdd = allCharacters
    .filter((character) => character.id !== activeCharacter.id)
    .filter((character) => !existingContactIds.has(character.id))
    .map((character) => ({
      id: character.id,
      name: character.name,
      title: character.title,
      key: character.key,
    }));

  return (
    <main className="min-h-screen bg-[#d7dbe2] p-4">
      <div className="mx-auto flex h-[92vh] max-w-7xl overflow-hidden rounded-2xl border border-black/10 bg-white shadow-xl">
        <aside className="w-[320px] shrink-0 border-r border-black/10 bg-[#f8fafc] p-4">
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <div className="text-xs text-[#677388]">You are</div>

            <form action={changeActiveCharacterAction}>
              <ActiveCharacterSelect
                defaultValue={activeCharacter.id}
                options={allCharacters.map((char) => ({
                  id: char.id,
                  name: char.name,
                }))}
              />
            </form>

            <div className="mt-3 flex gap-2">
              <Link
                href="/select"
                className="rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-[#2a313d]"
              >
                Change Character
              </Link>

              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-xl border border-black/10 px-3 py-2 text-sm font-semibold text-[#2a313d]"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 text-sm font-bold text-[#2a313d]">
              Conversations
            </div>

            {threads.length === 0 ? (
              <div className="rounded-xl border border-dashed border-black/10 p-3 text-sm text-[#677388]">
                No conversations yet.
              </div>
            ) : (
              threads.map((thread) => {
                const isActive = currentThread?.id === thread.id;

                return (
                  <Link
                    key={thread.id}
                    href={`/chat?thread=${thread.id}`}
                    className={`mb-2 flex items-center gap-3 rounded-xl border px-3 py-3 ${
                      isActive
                        ? "border-black/20 bg-white"
                        : "border-black/10 bg-white/70"
                    }`}
                  >
                    <Avatar
                      src={thread.contact?.avatar}
                      name={thread.contact?.name ?? "Unknown"}
                      size={42}
                    />

                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[#2a313d]">
                        {thread.contact?.name ?? "Unknown"}
                      </div>
                      <div className="truncate text-sm text-[#677388]">
                        {thread.contact?.title ?? thread.contact?.key ?? ""}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>

          <div className="mt-5">
            <AddContactModal availableCharacters={availableCharactersToAdd} />
          </div>
        </aside>

        <section className="flex flex-1 flex-col">
          <header className="border-b border-black/10 px-6 py-4">
            {currentThread?.contact ? (
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Avatar
                    src={currentThread.contact.avatar}
                    name={currentThread.contact.name}
                    size={52}
                  />

                  <div>
                    <div className="text-2xl font-bold text-[#2a313d]">
                      {currentThread.contact.name}
                    </div>
                    <div className="text-sm text-[#677388]">
                      You are {activeCharacter.name} talking to{" "}
                      {currentThread.contact.name}
                    </div>
                  </div>
                </div>

                <form action={resetConversationAction}>
                  <input type="hidden" name="threadId" value={currentThread.id} />
                  <input
                    type="hidden"
                    name="activeCharacterId"
                    value={activeCharacter.id}
                  />
                  <button
                    type="submit"
                    className="rounded-xl border border-black/10 px-4 py-2 text-sm font-semibold text-[#2a313d]"
                  >
                    Reset Conversation
                  </button>
                </form>
              </div>
            ) : (
              <div className="text-[#677388]">Select a contact</div>
            )}
          </header>

      
        </section>
      </div>
    </main>
  );
}