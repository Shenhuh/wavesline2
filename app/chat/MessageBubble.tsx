"use client";

import { useState } from "react";
import SpeechButton from "./SpeechButton";
import type { ClientMessage } from "./ChatMessagesClient";

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
        className="rounded-full object-cover"
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

const userTail: React.CSSProperties = {
  clipPath: "polygon(0 0, 100% 0, 0 100%)",
};
const contactTail: React.CSSProperties = {
  clipPath: "polygon(100% 0, 0 0, 100% 100%)",
};

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
      <div className="flex items-start justify-end">
        <div className="flex flex-col items-end">
          <span className="mb-1 text-[10px] font-semibold text-[#23252f]/40">
            {activeCharacterName}
          </span>
          <div className="flex items-start">
            <div
              className="font-medium max-w-[70vw] px-3 py-2 text-[11px] leading-snug text-white sm:max-w-[55vw] sm:px-4 sm:py-2.5 sm:text-[11.5px]"
              style={{
                fontFamily: "var(--font-lagu)",
                background: "#23252f",
                borderRadius: "4px 0px 12px 12px",
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
                  <div className="text-xs text-white/50">
                    {message.sticker.label}
                  </div>
                </div>
              ) : (
                message.content
              )}
            </div>
            <div className="h-5 w-3 shrink-0 bg-[#23252f]" style={userTail} />
          </div>
        </div>
        <Avatar src={activeCharacterAvatar} name={activeCharacterName} size={38} />
      </div>
    );
  }

  return (
    <div className="flex items-start">
      <Avatar src={contactAvatar} name={contactCharacterName} size={38} />
      <div className="flex flex-col items-start">
        <span className="mb-1 text-[10px] font-semibold text-[#23252f]/40">
          {contactCharacterName}
        </span>
        <div className="flex items-start">
          <div className="h-5 w-3 shrink-0 bg-white" style={contactTail} />
          <div
            className="font-medium max-w-[70vw] px-3 py-1 text-[11px] leading-tight text-[#23252f] sm:max-w-[55vw] sm:px-4 sm:py-1.5 sm:text-[11.5px]"
            style={{
              fontFamily: "var(--font-lagu)",
              background: "#ffffff",
              borderRadius: "0px 4px 12px 12px",
              wordBreak: "break-word",
              whiteSpace: "pre-wrap",
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
                <div className="text-xs text-[#23252f]/40">
                  {message.sticker.label}
                </div>
              </div>
            ) : isVoiceCharacterReply ? (
              <div className="min-w-[160px] space-y-2.5 sm:min-w-[180px]">
                <div
                  className="flex items-center gap-2 rounded px-3 py-2 text-xs text-[#23252f]/50"
                  style={{ background: "#f0f1f4" }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    className="shrink-0"
                  >
                    <rect
                      x="5"
                      y="1"
                      width="4"
                      height="8"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M2 7c0 2.76 2.24 5 5 5s5-2.24 5-5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="7"
                      y1="12"
                      x2="7"
                      y2="13"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
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
            ) : (
              message.content
            )}
          </div>
        </div>
      </div>
    </div>
  );
}