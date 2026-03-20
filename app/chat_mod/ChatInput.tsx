"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ClientMessage } from "./ChatMessagesClient";
import StickerPicker, { type StickerOption } from "./StickerPicker";

type ChatInputProps = {
  threadId: string;
  blocked?: boolean;
  blockMessage?: string | null;
  stickers?: StickerOption[];
  onOptimisticSend?: (content: string) => void;
  onOptimisticStickerSend?: (sticker: StickerOption) => void;
  onServerCommit?: (args: {
    savedUserMessage: ClientMessage;
    replyMessage?: ClientMessage;
    stickerReplyMessage?: ClientMessage | null;
    optimisticContent?: string;
  }) => void;
  onStickerServerCommit?: (savedMessage: ClientMessage, stickerId: string) => void;
  onSendError?: (content: string) => void;
  onStickerSendError?: (stickerId: string) => void;
};

export default function ChatInput({
  threadId,
  blocked = false,
  blockMessage = null,
  stickers = [],
  onOptimisticSend,
  onOptimisticStickerSend,
  onServerCommit,
  onStickerServerCommit,
  onSendError,
  onStickerSendError,
}: ChatInputProps) {
  const router = useRouter();

  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(blockMessage);
  const [isSending, setIsSending] = useState(false);
  const [isBlocked, setIsBlocked] = useState(blocked);
  const [isRequestingUnblock, setIsRequestingUnblock] = useState(false);

  async function sendMessage() {
    const trimmed = value.trim();
    if (!trimmed || isSending || isBlocked) return;

    setError(null);
    setValue("");
    setIsSending(true);

    onOptimisticSend?.(trimmed);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId,
          message: trimmed,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        onSendError?.(trimmed);

        if (response.status === 403 && data?.blocked) {
          setIsBlocked(true);
          setError(data?.error || "This conversation is over.");
          router.refresh();
          return;
        }

        setError(data?.error || "Failed to send message.");
        setValue(trimmed);
        return;
      }

      if (data?.savedUserMessage) {
        onServerCommit?.({
          savedUserMessage: data.savedUserMessage,
          replyMessage: data.replyMessage,
          stickerReplyMessage: data.stickerReplyMessage ?? null,
          optimisticContent: trimmed,
        });
      } else {
        router.refresh();
      }

      if (data?.blocked) {
        setIsBlocked(true);
        setError(data?.blockMessage || "This conversation is over.");
      }
    } catch {
      onSendError?.(trimmed);
      setError("Failed to send message.");
      setValue(trimmed);
    } finally {
      setIsSending(false);
    }
  }

  async function sendSticker(stickerId: string) {
    if (isSending || isBlocked) return;

    const sticker = stickers.find((item) => item.id === stickerId);
    if (!sticker) return;

    setError(null);
    setIsSending(true);
    onOptimisticStickerSend?.(sticker);

    try {
      const response = await fetch("/api/chat/sticker", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId,
          stickerId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        onStickerSendError?.(stickerId);
        setError(data?.error || "Failed to send sticker.");
        return;
      }

      if (data?.savedMessage) {
        onStickerServerCommit?.(data.savedMessage, stickerId);
      } else {
        router.refresh();
      }
    } catch {
      onStickerSendError?.(stickerId);
      setError("Failed to send sticker.");
    } finally {
      setIsSending(false);
    }
  }

  async function requestUnblock() {
    if (isRequestingUnblock) return;

    setIsRequestingUnblock(true);
    setError(null);

    try {
      const response = await fetch("/api/chat/unblock-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ threadId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data?.error || "Failed to request unblock.");
        return;
      }

      setIsBlocked(!data?.granted);
      router.refresh();
    } catch {
      setError("Failed to request unblock.");
    } finally {
      setIsRequestingUnblock(false);
    }
  }

  return (
    <div className="border-t border-black/10 bg-white p-4">
      {error ? (
        <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        {!isBlocked ? (
          <StickerPicker
            stickers={stickers}
            onPick={sendSticker}
            disabled={isSending}
          />
        ) : null}

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
          disabled={isBlocked || isSending}
          placeholder={
            isBlocked ? "This character has blocked you." : "Type a message..."
          }
          className="h-11 flex-1 rounded-xl border border-black/10 bg-white px-4 outline-none disabled:cursor-not-allowed disabled:bg-[#f3f4f6]"
        />

        {isBlocked ? (
          <button
            type="button"
            onClick={() => void requestUnblock()}
            disabled={isRequestingUnblock}
            className="rounded-xl border border-black/10 px-5 py-3 font-semibold text-[#2a313d] disabled:opacity-50"
          >
            {isRequestingUnblock ? "Requesting..." : "Request Unblock"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={isBlocked || isSending || !value.trim()}
            className="rounded-xl bg-[#2a313d] px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {isSending ? "..." : "Send"}
          </button>
        )}
      </div>
    </div>
  );
}