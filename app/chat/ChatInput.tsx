"use client";

import { useEffect, useRef, useState } from "react";
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
  threadId, blocked = false, blockMessage = null, stickers = [],
  onOptimisticSend, onOptimisticStickerSend, onServerCommit,
  onStickerServerCommit, onSendError, onStickerSendError,
}: ChatInputProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 68) + "px";
  }, [value]);

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

  const canSend = !isBlocked && !isSending && value.trim().length > 0;

  return (
    <div style={{ background: "#d8d5d0", borderTop: "1px solid rgba(0,0,0,0.08)", padding: "8px 10px 10px", flexShrink: 0 }}>
      {error && (
        <div style={{ background: "#fde8e8", border: "1px solid rgba(220,60,60,0.15)", borderRadius: 8, padding: "6px 10px", marginBottom: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 10.5, color: "#dc2626", fontWeight: 500 }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
            <line x1="6" y1="3.5" x2="6" y2="6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="6" cy="8.5" r="0.6" fill="currentColor" />
          </svg>
          {error}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-end", gap: 6, background: "#f0ede8", border: "1px solid rgba(0,0,0,0.11)", borderRadius: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}>
        {!isBlocked && (
          <div style={{ flexShrink: 0, padding: "6px 0 6px 6px" }}>
            <StickerPicker stickers={stickers} onPick={sendSticker} disabled={isSending} />
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendMessage();
            }
          }}
          disabled={isBlocked || isSending}
          placeholder={isBlocked ? "This character has blocked you." : "Type a message…"}
          style={{
            flex: 1,
            minWidth: 0,
            resize: "none",
            background: "transparent",
            outline: "none",
            border: "none",
            fontFamily: "var(--font-lagu)",
            fontSize: 11,
            lineHeight: 1.4,
            color: "#1a1c25",
            maxHeight: 68,
            overflowY: "auto",
            paddingTop: 8,
            paddingBottom: 8,
            paddingLeft: isBlocked ? 10 : 2,
            paddingRight: 2,
            cursor: isBlocked || isSending ? "not-allowed" : "text",
            opacity: isBlocked || isSending ? 0.5 : 1,
          }}
        />

        <div style={{ flexShrink: 0, padding: "6px 6px 6px 0" }}>
          {isBlocked ? (
            <button
              type="button"
              onClick={() => void requestUnblock()}
              disabled={isRequestingUnblock}
              style={{ background: "#23252f", borderRadius: 8, padding: "6px 12px", fontSize: 10.5, fontWeight: 600, color: "white", border: "none", cursor: isRequestingUnblock ? "not-allowed" : "pointer", opacity: isRequestingUnblock ? 0.4 : 1, fontFamily: "var(--font-lagu)" }}
            >
              {isRequestingUnblock ? "…" : "Unblock"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={!canSend}
              title="Send"
              style={{ width: 28, height: 28, borderRadius: 8, border: "none", display: "flex", alignItems: "center", justifyContent: "center", background: canSend ? "#23252f" : "#b8bac4", cursor: canSend ? "pointer" : "not-allowed", transition: "background 0.12s ease", flexShrink: 0 }}
            >
              {isSending ? (
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none" style={{ animation: "spin 0.85s linear infinite" }}>
                  <circle cx="7" cy="7" r="5" stroke="white" strokeWidth="2" strokeDasharray="18" strokeDashoffset="9" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                  <path d="M13 1L1 5.5L6 7.5M13 1L8.5 13L6 7.5M13 1L6 7.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}