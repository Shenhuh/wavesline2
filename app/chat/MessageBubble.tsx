"use client";
import { useState, useEffect } from "react";
import SpeechButton from "./SpeechButton";
import type { ClientMessage } from "./ChatMessagesClient";

type MessagePart =
  | { type: "text"; content: string }
  | { type: "visualization"; content: string };

function parseMessageContent(text: string): MessagePart[] {
  const parts: MessagePart[] = [];

  // Match properly closed tags
  const closedRegex = /<visualization>([\s\S]*?)<\/visualization>/g;
  let lastIndex = 0;
  let match;

  while ((match = closedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const t = text.slice(lastIndex, match.index).trim();
      if (t) parts.push({ type: "text", content: t });
    }
    parts.push({ type: "visualization", content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  // Handle unclosed <visualization> tag (model got cut off)
  const remaining = text.slice(lastIndex);
  const unclosedIdx = remaining.indexOf("<visualization>");
  if (unclosedIdx !== -1) {
    const before = remaining.slice(0, unclosedIdx).trim();
    if (before) parts.push({ type: "text", content: before });
    const vizContent = remaining.slice(unclosedIdx + "<visualization>".length).trim();
    if (vizContent) parts.push({ type: "visualization", content: vizContent });
  } else {
    const t = remaining.trim();
    if (t) parts.push({ type: "text", content: t });
  }

  return parts.length > 0 ? parts : [{ type: "text", content: text }];
}

function VisualizationBlock({ html }: { html: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      style={{
        margin: "6px 0",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid rgba(35,37,47,0.1)",
        background: "#fff",
        padding: "12px 10px",
        maxWidth: "100%",
        overflowX: "auto",
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

type MessageBubbleProps = {
  message: ClientMessage;
  activeCharacterName: string;
  activeCharacterAvatar?: string | null;
  contactCharacterName: string;
  contactCharacterKey?: string | null;
  contactVoiceOnly?: boolean;
  contactAutoPlayVoice?: boolean;
  contactPreferredVoice?: string | null;
  contactAvatar?: string | null;
  isLatestContactMessage?: boolean;
};

function Avatar({
  src,
  name,
  size = 38,
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
        className="rounded-full object-cover shrink-0"
        style={{ width: size, height: size, minWidth: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[#3a3d4a] font-semibold text-white/60"
      style={{
        width: size,
        height: size,
        minWidth: size,
        fontSize: size * 0.38,
      }}
    >
      {initial}
    </div>
  );
}

/** Typing indicator: three bouncing dots */
export function TypingIndicator({
  contactCharacterName,
  contactAvatar,
}: {
  contactCharacterName: string;
  contactAvatar?: string | null;
}) {
  return (
    <div className="flex items-end gap-2">
      <Avatar src={contactAvatar} name={contactCharacterName} size={32} />
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-[10px] font-semibold text-[#23252f]/40">
          {contactCharacterName}
        </span>
        <div
          className="flex items-center gap-1 rounded-2xl px-3.5 py-2.5"
          style={{
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            minWidth: 52,
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block rounded-full bg-[#23252f]/30"
              style={{
                width: 7,
                height: 7,
                animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function MessageBubble({
  message,
  activeCharacterName,
  activeCharacterAvatar = null,
  contactCharacterName,
  contactCharacterKey,
  contactVoiceOnly = false,
  contactAutoPlayVoice = false,
  contactPreferredVoice = null,
  contactAvatar = null,
  isLatestContactMessage = false,
}: MessageBubbleProps) {
  const isUser = message.sender_role === "active";
  const isVoiceCharacterReply = !isUser && contactVoiceOnly;
  const [showTranscript, setShowTranscript] = useState(!isVoiceCharacterReply);

  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2">
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] font-semibold text-[#23252f]/40">
            {activeCharacterName}
          </span>
          <div
            className="max-w-[70vw] sm:max-w-[55vw] px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-[11.5px] font-medium leading-snug text-white"
            style={{
              fontFamily: "var(--font-lagu)",
              background: "#23252f",
              borderRadius: "14px 14px 4px 14px",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
            }}
          >
            {message.message_type === "sticker" && message.sticker ? (
              <div className="space-y-1">
                <img
                  src={message.sticker.image_path}
                  alt={message.sticker.label}
                  className="h-20 w-20 object-contain sm:h-24 sm:w-24"
                />
                <div className="text-xs text-white/50">{message.sticker.label}</div>
              </div>
            ) : (
              message.content
            )}
          </div>
        </div>
        <Avatar src={activeCharacterAvatar} name={activeCharacterName} size={32} />
      </div>
    );
  }

  return (
    <div className="flex items-end gap-2">
      <Avatar src={contactAvatar} name={contactCharacterName} size={32} />
      <div className="flex flex-col items-start gap-0.5">
        <span className="text-[10px] font-semibold text-[#23252f]/40">
          {contactCharacterName}
        </span>
        <div
          className="max-w-[70vw] sm:max-w-[55vw] px-3 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-[11.5px] font-medium leading-snug text-[#23252f]"
          style={{
            fontFamily: "var(--font-lagu)",
            background: "#ffffff",
            borderRadius: "14px 14px 14px 4px",
            wordBreak: "break-word",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          {message.message_type === "sticker" && message.sticker ? (
            <div className="space-y-1">
              <img
                src={message.sticker.image_path}
                alt={message.sticker.label}
                className="h-20 w-20 object-contain sm:h-24 sm:w-24"
              />
              <div className="text-xs text-[#23252f]/40">{message.sticker.label}</div>
            </div>
          ) : isVoiceCharacterReply ? (
            <div className="min-w-[160px] space-y-2.5 sm:min-w-[180px]">
              <div
                className="flex items-center gap-2 rounded px-3 py-2 text-xs text-[#23252f]/50"
                style={{ background: "#f0f1f4" }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                  <rect x="5" y="1" width="4" height="8" rx="2" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M2 7c0 2.76 2.24 5 5 5s5-2.24 5-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <line x1="7" y1="12" x2="7" y2="13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {`Voice from ${contactCharacterName}`}
              </div>
              <SpeechButton
                text={message.content ?? ""}
                preferredVoice={contactPreferredVoice}
                autoPlay={contactAutoPlayVoice && isLatestContactMessage}
                buttonLabel="Play Voice"
              />
              <button
                type="button"
                onClick={() => setShowTranscript((v) => !v)}
                className="text-[11px] font-medium text-[#23252f]/40 transition-colors hover:text-[#23252f]/70"
              >
                {showTranscript ? "Hide transcript" : "Show transcript"}
              </button>
              {showTranscript && (
                <div className="text-[13px] leading-snug text-[#23252f]/70">
                  {message.content}
                </div>
              )}
            </div>
          ) : (() => {
              const parts = parseMessageContent(message.content ?? "");
              return (
                <>
                  {parts.map((part, i) =>
                    part.type === "visualization" ? (
                      <VisualizationBlock key={i} html={part.content} />
                    ) : (
                      <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part.content}</span>
                    )
                  )}
                </>
              );
            })()}
        </div>
      </div>
    </div>
  );
}