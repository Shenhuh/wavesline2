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
import { changeActiveCharacterAction, resetConversationAction } from "./actions";
import ChatMessagesClient from "./ChatMessagesClient";
import AddContactModal from "./AddContactModal";
import MobileSidebar from "./MobileSidebar";
import SettingsMenu from "./SettingsMenu";
import InfoModal from "./InfoModal";

function Avatar({
  src,
  name,
  size = 36,
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
      className="flex items-center justify-center rounded-full bg-[#3a3d4a] font-semibold text-white/60"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
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
    .filter((c) => c.id !== activeCharacter.id && !existingContactIds.has(c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      title: c.title,
      key: c.key,
    }));

  return (
    <main
      className="overflow-hidden bg-[linear-gradient(135deg,#1a1c25_0%,#23263a_60%,#1a1e2e_100%)] font-['Lagusans']"
      style={{ height: "100svh" }}
    >
      <div className="mx-auto flex h-full w-full flex-col px-0 py-0 sm:px-3 sm:py-3">
        {/* Top bar */}
        <div
          className="mx-auto flex h-11 w-full shrink-0 items-center justify-between border-b border-white/10 px-3 sm:px-4"
          style={{
            maxWidth: 920,
            background: "#23252f",
            borderTopLeftRadius: 10,
            borderTopRightRadius: 10,
          }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div className="sm:hidden">
              <MobileSidebar
                activeCharacterId={activeCharacter.id}
                activeCharacterName={activeCharacter.name}
                allCharacters={allCharacters.map((c) => ({
                  id: c.id,
                  name: c.name,
                }))}
                threads={threads}
                currentThreadId={currentThread?.id}
                availableCharacters={availableCharactersToAdd}
              />
            </div>

            <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-white/10">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect
                  x="1"
                  y="2.5"
                  width="10"
                  height="7"
                  rx="1.5"
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth="1.1"
                />
                <path
                  d="M1 4L6 7.5L11 4"
                  stroke="rgba(255,255,255,0.6)"
                  strokeWidth="1.1"
                />
              </svg>
            </div>

            <span className="text-[11px] font-semibold tracking-wide text-white/60">
              WavesLine
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <SettingsMenu
              activeCharacterId={activeCharacter.id}
              allCharacters={allCharacters.map((c) => ({
                id: c.id,
                name: c.name,
              }))}
              changeActiveCharacterAction={changeActiveCharacterAction}
              signOutAction={signOut}
            />

            <InfoModal />

            <button
              className="flex h-6 w-6 items-center justify-center"
              title="Close"
              type="button"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M1 1L11 11M11 1L1 11"
                  stroke="rgba(255,255,255,0.4)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Main shell */}
        <div
          className="mx-auto flex w-full min-h-0 flex-1 overflow-hidden border border-t-0 border-white/10 bg-white/5 shadow-[0_8px_48px_rgba(0,0,0,0.55)] sm:rounded-b-xl"
          style={{
            maxWidth: 920,
          }}
        >
          {/* Desktop sidebar */}
          <aside
            className="hidden w-[215px] shrink-0 flex-col sm:flex"
            style={{ background: "#23252f" }}
          >
            <div className="flex-1 overflow-y-auto">
              {threads.length === 0 ? (
                <div className="px-4 py-3 text-xs text-white/20">
                  No conversations yet.
                </div>
              ) : (
                threads.map((thread) => {
                  const isActive = currentThread?.id === thread.id;

                  return (
                    <Link
                      key={thread.id}
                      href={`/chat?thread=${thread.id}`}
                      className="block"
                    >
                      <div
                        className={`relative flex items-center gap-3 px-3 py-2.5 transition-all ${
                          isActive ? "bg-white" : "hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="relative shrink-0">
                          <Avatar
                            src={thread.contact?.avatar}
                            name={thread.contact?.name ?? "?"}
                            size={36}
                          />
                          {!isActive && (
                            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-[#23252f]" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div
                            className={`truncate text-sm font-semibold ${
                              isActive ? "text-[#23252f]" : "text-white/80"
                            }`}
                          >
                            {thread.contact?.name ?? "Unknown"}
                          </div>
                          <div
                            className={`truncate text-[11px] ${
                              isActive ? "text-[#23252f]/50" : "text-white/35"
                            }`}
                          >
                            {thread.contact?.title ?? thread.contact?.key ?? ""}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>

            <div
              className="p-3"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <AddContactModal availableCharacters={availableCharactersToAdd} />
            </div>
          </aside>

          {/* Right side */}
          <div className="flex min-w-0 min-h-0 flex-1 flex-col">
            {currentThread?.contact ? (
              <div
                className="flex shrink-0 items-center justify-between gap-4 px-4 py-3 sm:px-5"
                style={{
                  background: "#e9eaee",
                  borderBottom: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar
                    src={currentThread.contact.avatar}
                    name={currentThread.contact.name}
                    size={40}
                  />
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-bold text-[#23252f] sm:text-[16px]">
                      {currentThread.contact.name}
                    </div>
                    <div className="truncate text-[11px] text-[#23252f]/38">
                      {fullContactCharacter?.title ??
                        currentThread.contact?.title ??
                        ""}
                    </div>
                  </div>
                </div>

                <form action={resetConversationAction} className="shrink-0">
                  <input type="hidden" name="threadId" value={currentThread.id} />
                  <input
                    type="hidden"
                    name="activeCharacterId"
                    value={activeCharacter.id}
                  />
                  <button
                    type="submit"
                    title="Reset conversation"
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-black/[0.06]"
                  >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path
                        d="M13 7.5A5.5 5.5 0 1 1 7.5 2a5.48 5.48 0 0 1 3.89 1.61L13 2"
                        stroke="#23252f"
                        strokeOpacity="0.4"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M13 2v3.5H9.5"
                        stroke="#23252f"
                        strokeOpacity="0.4"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </form>
              </div>
            ) : null}

            <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#e9eaee]">
              {currentThread ? (
                <ChatMessagesClient
                  key={currentThread.id}
                  threadId={currentThread.id}
                  activeCharacterName={activeCharacter.name}
                  activeCharacterAvatar={activeCharacter.avatar ?? null}
                  contactCharacterName={currentThread.contact?.name ?? "Unknown"}
                  contactCharacterKey={
                    fullContactCharacter?.key ?? currentThread.contact?.key
                  }
                  contactVoiceOnly={fullContactCharacter?.voice_only ?? false}
                  contactAutoPlayVoice={
                    fullContactCharacter?.auto_play_voice ?? false
                  }
                  contactPreferredVoice={
                    fullContactCharacter?.preferred_voice ?? null
                  }
                  contactAvatar={currentThread.contact?.avatar ?? null}
                  stickers={stickers.map((s) => ({
                    id: s.id,
                    key: s.key,
                    label: s.label,
                    image_path: s.image_path,
                  }))}
                  initialMessages={messages}
                  blocked={isBlocked}
                  blockMessage={blockMessage}
                />
              ) : (
                <>
                  <div className="flex flex-1 items-center justify-center">
                    <p className="text-sm text-[#23252f]/30">
                      Pick a contact to start chatting.
                    </p>
                  </div>
                  <div className="border-t border-black/10 p-4 text-xs text-[#23252f]/30">
                    No active thread.
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}