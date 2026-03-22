"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ChatInput from "./ChatInput";
import MessageBubble, { TypingIndicator } from "./MessageBubble";
import type { StickerOption } from "./StickerPicker";
import type { GifOption } from "./GifPicker";

export type ClientMessage = {
  id: string;
  thread_id: string;
  sender_role: "active" | "contact";
  content: string | null;
  created_at: string;
  message_type: "text" | "sticker" | "gif";
  sticker_id: string | null;
  sticker: { id: string; key: string; label: string; image_path: string } | null;
  gif_url?: string | null;
  // From optimistic stamping (new messages)
  resolvedName?: string | null;
  resolvedAvatar?: string | null;
  // From DB (persisted after refresh)
  resolved_name?: string | null;
  resolved_avatar?: string | null;
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

// Fires regardless of component mount state — called OUTSIDE setState callbacks
function fireNewMessage(threadId: string, createdAt: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("wavesline:newmessage", { detail: { threadId, createdAt } })
    );
  }
}

export default function ChatMessagesClient({
  threadId, activeCharacterName, activeCharacterAvatar = null,
  contactCharacterName, contactCharacterKey = null,
  contactVoiceOnly = false, contactAutoPlayVoice = false,
  contactPreferredVoice = null, contactAvatar = null,
  stickers = [], initialMessages, blocked = false, blockMessage = null,
}: ChatMessagesClientProps) {
  const [optimisticMessages, setOptimisticMessages] = useState<ClientMessage[]>(initialMessages);
  const [isTyping, setIsTyping] = useState(false);
  const visibleMessages = useMemo(() => optimisticMessages, [optimisticMessages]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleMessages, isTyping]);

  function appendOptimisticUserMessage(content: string) {
    setOptimisticMessages((prev) => [...prev, {
      id: `optimistic-user-${crypto.randomUUID()}`, thread_id: threadId,
      sender_role: "active", content, created_at: new Date().toISOString(),
      message_type: "text", sticker_id: null, sticker: null,
    }]);
    setIsTyping(true);
  }

  function appendOptimisticStickerMessage(sticker: StickerOption) {
    setOptimisticMessages((prev) => [...prev, {
      id: `optimistic-sticker-${crypto.randomUUID()}`, thread_id: threadId,
      sender_role: "active", content: null, created_at: new Date().toISOString(),
      message_type: "sticker", sticker_id: sticker.id,
      sticker: { id: sticker.id, key: sticker.key, label: sticker.label, image_path: sticker.image_path },
    }]);
    setIsTyping(true);
  }

  function replaceAfterServer(args: {
    savedUserMessage: ClientMessage;
    replyMessage?: ClientMessage;
    stickerReplyMessage?: ClientMessage | null;
    optimisticContent?: string;
    resolvedName?: string | null;
    resolvedAvatar?: string | null;
  }) {
    const { savedUserMessage, replyMessage, stickerReplyMessage, optimisticContent, resolvedName, resolvedAvatar } = args;

    // Stamp resolved form onto reply messages only
    const stampedReply = replyMessage
      ? { ...replyMessage, resolvedName: resolvedName ?? null, resolvedAvatar: resolvedAvatar ?? null }
      : undefined;
    const stampedSticker = stickerReplyMessage
      ? { ...stickerReplyMessage, resolvedName: resolvedName ?? null, resolvedAvatar: resolvedAvatar ?? null }
      : null;

    // Fire events BEFORE setState — these must run even if component unmounts
    if (replyMessage) fireNewMessage(threadId, replyMessage.created_at);
    if (stickerReplyMessage) fireNewMessage(threadId, stickerReplyMessage.created_at);

    setIsTyping(false);
    setOptimisticMessages((prev) => {
      let next = optimisticContent
        ? prev.filter((m) => !(m.id.startsWith("optimistic-user-") && m.sender_role === "active" && m.content === optimisticContent))
        : prev;
      next = [...next, savedUserMessage];
      if (stampedReply) next.push(stampedReply);
      if (stampedSticker) next.push(stampedSticker);
      return next;
    });
  }

  function replaceStickerAfterServer(savedMessage: ClientMessage, stickerId: string) {
    setIsTyping(false);
    setOptimisticMessages((prev) => [
      ...prev.filter((m) => !(m.id.startsWith("optimistic-sticker-") && m.sender_role === "active" && m.sticker_id === stickerId)),
      savedMessage,
    ]);
  }

  function handleStickerAiReply(args: {
    replyMessage: ClientMessage;
    stickerReplyMessage?: ClientMessage | null;
    resolvedName?: string | null;
    resolvedAvatar?: string | null;
  }) {
    const { replyMessage, stickerReplyMessage, resolvedName, resolvedAvatar } = args;
    const stampedReply = { ...replyMessage, resolvedName: resolvedName ?? null, resolvedAvatar: resolvedAvatar ?? null };
    const stampedSticker = stickerReplyMessage
      ? { ...stickerReplyMessage, resolvedName: resolvedName ?? null, resolvedAvatar: resolvedAvatar ?? null }
      : null;
    if (replyMessage) fireNewMessage(threadId, replyMessage.created_at);
    if (stickerReplyMessage) fireNewMessage(threadId, stickerReplyMessage.created_at);
    setOptimisticMessages((prev) => {
      const next = [...prev, stampedReply];
      if (stampedSticker) next.push(stampedSticker);
      return next;
    });
  }

  function appendOptimisticGifMessage(gif: GifOption) {
    setOptimisticMessages((prev) => [...prev, {
      id: `optimistic-gif-${crypto.randomUUID()}`,
      thread_id: threadId,
      sender_role: "active",
      content: gif.title,
      created_at: new Date().toISOString(),
      message_type: "gif",
      sticker_id: null,
      sticker: null,
      gif_url: gif.url,
    }]);
    setIsTyping(true);
  }

  function replaceGifAfterServer(args: {
    savedMessage: ClientMessage;
    replyMessage?: ClientMessage | null;
    gifReplyMessage?: ClientMessage | null;
    optimisticGifUrl?: string;
    resolvedName?: string | null;
    resolvedAvatar?: string | null;
  }) {
    const { savedMessage, replyMessage, gifReplyMessage, optimisticGifUrl, resolvedName, resolvedAvatar } = args;
    if (replyMessage) fireNewMessage(threadId, replyMessage.created_at);
    if (gifReplyMessage) fireNewMessage(threadId, gifReplyMessage.created_at);
    const stampedReply = replyMessage
      ? { ...replyMessage, resolvedName: resolvedName ?? null, resolvedAvatar: resolvedAvatar ?? null }
      : null;
    const stampedGifReply = gifReplyMessage
      ? { ...gifReplyMessage, resolvedName: resolvedName ?? null, resolvedAvatar: resolvedAvatar ?? null }
      : null;
    setIsTyping(false);
    setOptimisticMessages((prev) => {
      let next = optimisticGifUrl
        ? prev.filter((m) => !(m.id.startsWith("optimistic-gif-") && m.gif_url === optimisticGifUrl))
        : prev;
      next = [...next, savedMessage];
      if (stampedReply) next.push(stampedReply);
      if (stampedGifReply) next.push(stampedGifReply);
      return next;
    });
  }

  function rollbackOptimisticGif(gifUrl: string) {
    setIsTyping(false);
    setOptimisticMessages((prev) => prev.filter((m) => !(m.id.startsWith("optimistic-gif-") && m.gif_url === gifUrl)));
  }

  function rollbackOptimistic(content: string) {
    setIsTyping(false);
    setOptimisticMessages((prev) => prev.filter((m) => !(m.id.startsWith("optimistic-user-") && m.sender_role === "active" && m.content === content)));
  }

  function rollbackOptimisticSticker(stickerId: string) {
    setIsTyping(false);
    setOptimisticMessages((prev) => prev.filter((m) => !(m.id.startsWith("optimistic-sticker-") && m.sender_role === "active" && m.sticker_id === stickerId)));
  }

  const latestContactMessageId = [...visibleMessages].reverse().find((m) => m.sender_role === "contact")?.id;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 sm:px-5 py-4 sm:py-5" style={{ background: "#eae7e1" }}>
        <div className="mb-5 flex items-center justify-center gap-1.5">
          <svg width="10" height="10" viewBox="0 0 11 11" fill="none" className="shrink-0">
            <path d="M5.5 1L6.8 4H10L7.3 6L8.3 9L5.5 7.3L2.7 9L3.7 6L1 4H4.2L5.5 1Z"
              stroke="#23252f" strokeWidth="1" strokeOpacity="0.25" fill="none" />
          </svg>
          <span style={{ fontSize: 10.5, color: "rgba(35,37,47,0.3)", letterSpacing: "0.02em" }}>
            You are now friends with {contactCharacterName}
          </span>
        </div>

        {visibleMessages.length === 0 && !isTyping ? (
          <div className="rounded-xl px-4 py-3 text-center"
            style={{ fontSize: 12, color: "rgba(35,37,47,0.35)", background: "rgba(255,255,255,0.55)", border: "1px dashed rgba(0,0,0,0.09)" }}>
            No messages yet. Say hello!
          </div>
        ) : (
          <div className="space-y-2.5">
            {visibleMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                activeCharacterName={activeCharacterName}
                activeCharacterAvatar={activeCharacterAvatar}
                contactCharacterName={message.resolvedName ?? message.resolved_name ?? contactCharacterName}
                contactCharacterKey={contactCharacterKey}
                contactVoiceOnly={contactVoiceOnly}
                contactAutoPlayVoice={contactAutoPlayVoice}
                contactPreferredVoice={contactPreferredVoice}
                contactAvatar={message.resolvedAvatar ?? message.resolved_avatar ?? contactAvatar}
                isLatestContactMessage={message.id === latestContactMessageId}
              />
            ))}
            {isTyping && (
              <TypingIndicator
                contactCharacterName={contactCharacterName}
                contactAvatar={contactAvatar}
              />
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <ChatInput
        threadId={threadId} blocked={blocked} blockMessage={blockMessage} stickers={stickers}
        onOptimisticSend={appendOptimisticUserMessage}
        onOptimisticStickerSend={appendOptimisticStickerMessage}
        onServerCommit={replaceAfterServer}
        onStickerServerCommit={replaceStickerAfterServer}
        onStickerAiReply={handleStickerAiReply}
        onOptimisticGifSend={appendOptimisticGifMessage}
        onGifServerCommit={replaceGifAfterServer}
        onGifSendError={rollbackOptimisticGif}
        onSendError={rollbackOptimistic}
        onStickerSendError={rollbackOptimisticSticker}
      />
    </>
  );
}