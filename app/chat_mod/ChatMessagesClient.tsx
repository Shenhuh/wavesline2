"use client";

import { useMemo, useState } from "react";
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
  sticker: {
    id: string;
    key: string;
    label: string;
    image_path: string;
  } | null;
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
  threadId,
  activeCharacterName,
  activeCharacterAvatar = null,
  contactCharacterName,
  contactCharacterKey = null,
  contactVoiceOnly = false,
  contactAutoPlayVoice = false,
  contactPreferredVoice = null,
  contactAvatar = null,
  stickers = [],
  initialMessages,
  blocked = false,
  blockMessage = null,
}: ChatMessagesClientProps) {
  const [optimisticMessages, setOptimisticMessages] =
    useState<ClientMessage[]>(initialMessages);

  const visibleMessages = useMemo(() => optimisticMessages, [optimisticMessages]);

  function appendOptimisticUserMessage(content: string) {
    const optimisticMessage: ClientMessage = {
      id: `optimistic-user-${crypto.randomUUID()}`,
      thread_id: threadId,
      sender_role: "active",
      content,
      created_at: new Date().toISOString(),
      message_type: "text",
      sticker_id: null,
      sticker: null,
    };

    setOptimisticMessages((prev) => [...prev, optimisticMessage]);
  }

  function appendOptimisticStickerMessage(sticker: StickerOption) {
    const optimisticMessage: ClientMessage = {
      id: `optimistic-sticker-${crypto.randomUUID()}`,
      thread_id: threadId,
      sender_role: "active",
      content: null,
      created_at: new Date().toISOString(),
      message_type: "sticker",
      sticker_id: sticker.id,
      sticker: {
        id: sticker.id,
        key: sticker.key,
        label: sticker.label,
        image_path: sticker.image_path,
      },
    };

    setOptimisticMessages((prev) => [...prev, optimisticMessage]);
  }

  function replaceAfterServer(args: {
    savedUserMessage: ClientMessage;
    replyMessage?: ClientMessage;
    stickerReplyMessage?: ClientMessage | null;
    optimisticContent?: string;
  }) {
    const { savedUserMessage, replyMessage, stickerReplyMessage, optimisticContent } = args;

    setOptimisticMessages((prev) => {
      let next = prev;

      if (optimisticContent) {
        next = prev.filter(
          (msg) =>
            !(
              msg.id.startsWith("optimistic-user-") &&
              msg.sender_role === "active" &&
              msg.content === optimisticContent
            )
        );
      }

      next = [...next, savedUserMessage];

      if (replyMessage) next.push(replyMessage);
      if (stickerReplyMessage) next.push(stickerReplyMessage);

      return next;
    });
  }

  function replaceStickerAfterServer(savedMessage: ClientMessage, stickerId: string) {
    setOptimisticMessages((prev) => {
      const next = prev.filter(
        (msg) =>
          !(
            msg.id.startsWith("optimistic-sticker-") &&
            msg.sender_role === "active" &&
            msg.sticker_id === stickerId
          )
      );

      return [...next, savedMessage];
    });
  }

  function rollbackOptimistic(content: string) {
    setOptimisticMessages((prev) =>
      prev.filter(
        (msg) =>
          !(
            msg.id.startsWith("optimistic-user-") &&
            msg.sender_role === "active" &&
            msg.content === content
          )
      )
    );
  }

  function rollbackOptimisticSticker(stickerId: string) {
    setOptimisticMessages((prev) =>
      prev.filter(
        (msg) =>
          !(
            msg.id.startsWith("optimistic-sticker-") &&
            msg.sender_role === "active" &&
            msg.sticker_id === stickerId
          )
      )
    );
  }

  const latestContactMessageId = [...visibleMessages]
    .reverse()
    .find((m) => m.sender_role === "contact")?.id;

  return (
    <>
      <div className="flex-1 overflow-y-auto bg-[#f5f7fa] px-6 py-5">
        {visibleMessages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/10 bg-white p-4 text-sm text-[#677388]">
            No messages yet.
          </div>
        ) : (
          <div className="space-y-4">
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
          </div>
        )}
      </div>

      <ChatInput
        threadId={threadId}
        blocked={blocked}
        blockMessage={blockMessage}
        stickers={stickers}
        onOptimisticSend={appendOptimisticUserMessage}
        onOptimisticStickerSend={appendOptimisticStickerMessage}
        onServerCommit={replaceAfterServer}
        onStickerServerCommit={replaceStickerAfterServer}
        onSendError={rollbackOptimistic}
        onStickerSendError={rollbackOptimisticSticker}
      />
    </>
  );
}