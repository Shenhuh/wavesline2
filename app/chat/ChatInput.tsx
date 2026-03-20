"use client";

import { useEffect, useState } from "react";
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
  onStickerServerCommit?: (
    savedMessage: ClientMessage,
    stickerId: string
  ) => void;
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

  useEffect(() => {
    setValue("");
    setError(blockMessage);
    setIsSending(false);
    setIsBlocked(blocked);
    setIsRequestingUnblock(false);
  }, [threadId, blocked, blockMessage]);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, message: trimmed }),
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

    const sticker = stickers.find((s) => s.id === stickerId);
    if (!sticker) return;

    setError(null);
    setIsSending(true);
    onOptimisticStickerSend?.(sticker);

    try {
      const response = await fetch("/api/chat/sticker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, stickerId }),
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
        headers: { "Content-Type": "application/json" },
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
    <div
      className="shrink-0 px-2 pb-2 pt-1 sm:px-2.5 sm:pb-2.5 sm:pt-1.5"
      style={{
        background: "#e9eaee",
        borderTop: "1px solid rgba(0,0,0,0.06)",
      }}
    >
      {error ? (
        <div
          className="mb-1.5 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] text-red-600"
          style={{ background: "#fde8e8" }}
        >
          <svg
            width="11"
            height="11"
            viewBox="0 0 12 12"
            fill="none"
            className="shrink-0"
          >
            <circle
              cx="6"
              cy="6"
              r="5"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <line
              x1="6"
              y1="3.5"
              x2="6"
              y2="6.5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
            <circle cx="6" cy="8.5" r="0.6" fill="currentColor" />
          </svg>
          {error}
        </div>
      ) : null}

      <div
        className="flex items-center gap-1 rounded-lg px-1 py-1 sm:gap-1.5"
        style={{
          background: "rgba(255,255,255,0.76)",
          border: "1px solid rgba(0,0,0,0.08)",
          backdropFilter: "blur(8px)",
        }}
      >
        {!isBlocked ? (
          <div className="shrink-0 scale-90 origin-left sm:scale-95">
            <StickerPicker
              stickers={stickers}
              onPick={sendSticker}
              disabled={isSending}
            />
          </div>
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
            isBlocked ? "This character has blocked you." : "Type a message…"
          }
          className="h-7 flex-1 bg-transparent px-1.5 text-[11px] text-[#23252f] outline-none placeholder:text-[#23252f]/32 disabled:cursor-not-allowed disabled:opacity-50 sm:h-8 sm:px-2 sm:text-[11.5px]"
          style={{
            fontFamily: "var(--font-lagu)",
            minWidth: 0,
          }}
        />

        {isBlocked ? (
          <button
            type="button"
            onClick={() => void requestUnblock()}
            disabled={isRequestingUnblock}
            className="shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-40"
            style={{
              background: "#23252f",
              fontFamily: "var(--font-lagu)",
            }}
          >
            {isRequestingUnblock ? "..." : "Unblock"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void sendMessage()}
            disabled={isBlocked || isSending || !value.trim()}
            title="Send"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-opacity hover:opacity-90 disabled:opacity-40 sm:h-8 sm:w-8"
            style={{ background: "#23252f" }}
          >
            {isSending ? (
              <svg
                width="11"
                height="11"
                viewBox="0 0 14 14"
                fill="none"
                style={{ animation: "spin 1s linear infinite" }}
              >
                <circle
                  cx="7"
                  cy="7"
                  r="5.5"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeDasharray="20"
                  strokeDashoffset="10"
                />
              </svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                <path
                  d="M13 1L1 5.5L6 7.5M13 1L8.5 13L6 7.5M13 1L6 7.5"
                  stroke="white"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}