"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ChatInput from "./ChatInput";
import MessageBubble from "./MessageBubble";
import type { StickerOption } from "./StickerPicker";

export type ClientMessage = {
  id: string;
  thread_id: string;
  sender_role: "active" | "contact";
  content: string | null;
  created_at: string;
  message_type: "text" | "sticker";
  sticker_id: string | null;
  sticker: { id: string; key: string; label: string; image_path: string } | null;
};

type ChatMessagesClientProps = {
  threadId: string;
  activeCharacterName: string;
  activeCharacterAvatar?: string | null;
  contactCharacterName: string;
  contactCharacterKey?: string | null;
  contactVoiceOnly?: boolean;
  contactAutoPlayVoice?: boolean;
  contactPreferredVoice?: string | null;
  contactAvatar?: string | null;
  stickers?: StickerOption[];
  initialMessages: ClientMessage[];
  blocked?: boolean;
  blockMessage?: string | null;
};

export default function ChatMessagesClient({
  threadId, activeCharacterName, activeCharacterAvatar = null,
  contactCharacterName, contactCharacterKey = null,
  contactVoiceOnly = false, contactAutoPlayVoice = false,
  contactPreferredVoice = null, contactAvatar = null,
  stickers = [], initialMessages, blocked = false, blockMessage = null,
}: ChatMessagesClientProps) {
  const [optimisticMessages, setOptimisticMessages] = useState<ClientMessage[]>(initialMessages);
  const visibleMessages = useMemo(() => optimisticMessages, [optimisticMessages]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages]);

  function appendOptimisticUserMessage(content: string) {
    setOptimisticMessages((prev) => [...prev, {
      id: `optimistic-user-${crypto.randomUUID()}`, thread_id: threadId,
      sender_role: "active", content, created_at: new Date().toISOString(),
      message_type: "text", sticker_id: null, sticker: null,
    }]);
  }

  function appendOptimisticStickerMessage(sticker: StickerOption) {
    setOptimisticMessages((prev) => [...prev, {
      id: `optimistic-sticker-${crypto.randomUUID()}`, thread_id: threadId,
      sender_role: "active", content: null, created_at: new Date().toISOString(),
      message_type: "sticker", sticker_id: sticker.id,
      sticker: { id: sticker.id, key: sticker.key, label: sticker.label, image_path: sticker.image_path },
    }]);
  }

  function replaceAfterServer(args: { savedUserMessage: ClientMessage; replyMessage?: ClientMessage; stickerReplyMessage?: ClientMessage | null; optimisticContent?: string }) {
    const { savedUserMessage, replyMessage, stickerReplyMessage, optimisticContent } = args;
    setOptimisticMessages((prev) => {
      let next = optimisticContent
        ? prev.filter((m) => !(m.id.startsWith("optimistic-user-") && m.sender_role === "active" && m.content === optimisticContent))
        : prev;
      next = [...next, savedUserMessage];
      if (replyMessage) next.push(replyMessage);
      if (stickerReplyMessage) next.push(stickerReplyMessage);
      return next;
    });
  }

  function replaceStickerAfterServer(savedMessage: ClientMessage, stickerId: string) {
    setOptimisticMessages((prev) => [
      ...prev.filter((m) => !(m.id.startsWith("optimistic-sticker-") && m.sender_role === "active" && m.sticker_id === stickerId)),
      savedMessage,
    ]);
  }

  function rollbackOptimistic(content: string) {
    setOptimisticMessages((prev) => prev.filter((m) => !(m.id.startsWith("optimistic-user-") && m.sender_role === "active" && m.content === content)));
  }

  function rollbackOptimisticSticker(stickerId: string) {
    setOptimisticMessages((prev) => prev.filter((m) => !(m.id.startsWith("optimistic-sticker-") && m.sender_role === "active" && m.sticker_id === stickerId)));
  }

  const latestContactMessageId = [...visibleMessages].reverse().find((m) => m.sender_role === "contact")?.id;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5" style={{ background: "#e9eaee" }}>
        <div className="mb-4 flex items-center justify-center gap-1.5">
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" className="shrink-0">
            <path d="M5.5 1L6.8 4H10L7.3 6L8.3 9L5.5 7.3L2.7 9L3.7 6L1 4H4.2L5.5 1Z" stroke="#23252f" strokeWidth="1" strokeOpacity="0.3" fill="none"/>
          </svg>
          <span className="text-[11px] text-[#23252f]/35">You are now friends with {contactCharacterName}</span>
        </div>

        {visibleMessages.length === 0 ? (
          <div className="rounded px-4 py-3 text-sm text-[#23252f]/40" style={{ background: "rgba(255,255,255,0.6)", border: "1px dashed rgba(0,0,0,0.1)" }}>
            No messages yet.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                activeCharacterName={activeCharacterName}
                activeCharacterAvatar={activeCharacterAvatar}
                contactCharacterName={contactCharacterName}
                contactCharacterKey={contactCharacterKey}
                contactVoiceOnly={contactVoiceOnly}
                contactAutoPlayVoice={contactAutoPlayVoice}
                contactPreferredVoice={contactPreferredVoice}
                contactAvatar={contactAvatar}
                isLatestContactMessage={message.id === latestContactMessageId}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <ChatInput
        threadId={threadId} blocked={blocked} blockMessage={blockMessage} stickers={stickers}
        onOptimisticSend={appendOptimisticUserMessage} onOptimisticStickerSend={appendOptimisticStickerMessage}
        onServerCommit={replaceAfterServer} onStickerServerCommit={replaceStickerAfterServer}
        onSendError={rollbackOptimistic} onStickerSendError={rollbackOptimisticSticker}
      />
    </>
  );
}