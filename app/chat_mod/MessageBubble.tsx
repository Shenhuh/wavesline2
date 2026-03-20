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
  size = 32,
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
      className="flex items-center justify-center rounded-full bg-[#232833] text-xs font-semibold text-white"
      style={{ width: size, height: size }}
    >
      {initial}
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
  const isQiuyuan = (contactCharacterKey ?? "").toLowerCase() === "qiuyuan";
  const [showTranscript, setShowTranscript] = useState(!isVoiceCharacterReply);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser ? (
        <div className="mr-3 self-end">
          <Avatar src={contactAvatar} name={contactCharacterName} size={34} />
        </div>
      ) : null}

      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${
          isUser
            ? "bg-[#232833] text-white"
            : "border border-black/10 bg-white text-[#2a313d]"
        }`}
      >
        <div
          className={`mb-1 text-xs font-semibold ${
            isUser ? "text-white/70" : "text-[#677388]"
          }`}
        >
          {isUser ? activeCharacterName : contactCharacterName}
        </div>

        {message.message_type === "sticker" && message.sticker ? (
          <div className="space-y-2">
            <img
              src={message.sticker.image_path}
              alt={message.sticker.label}
              className="h-28 w-28 object-contain"
            />
            <div
              className={`text-xs ${
                isUser ? "text-white/70" : "text-[#677388]"
              }`}
            >
              {message.sticker.label}
            </div>
          </div>
        ) : isVoiceCharacterReply ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-black/10 bg-[#f8fafc] px-3 py-3 text-sm text-[#677388]">
              {isQiuyuan ? "Voice message from Qiuyuan" : "Voice message"}
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
              className="text-xs font-semibold text-[#677388]"
            >
              {showTranscript ? "Hide Transcript" : "Show Transcript"}
            </button>

            {showTranscript ? (
              <div className="whitespace-pre-wrap break-words text-[15px] leading-6">
                {message.content}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words text-[15px] leading-6">
            {message.content}
          </div>
        )}
      </div>

      {isUser ? (
        <div className="ml-3 self-end">
          <Avatar src={activeCharacterAvatar} name={activeCharacterName} size={34} />
        </div>
      ) : null}
    </div>
  );
}