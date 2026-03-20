import type { ChatMessage } from "@/lib/chat/types";

type MessageBubbleProps = {
  message: ChatMessage;
  characterName: string;
};

export default function MessageBubble({
  message,
  characterName,
}: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[78%] items-end gap-3 ${
          isUser ? "flex-row-reverse" : "flex-row"
        }`}
      >
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold shadow-sm ${
            isUser
              ? "bg-[#1f2430] text-white"
              : "border border-[rgba(160,170,184,0.35)] bg-[rgba(255,255,255,0.92)] text-[#7b869a]"
          }`}
        >
          {isUser ? "YU" : characterName.slice(0, 2).toUpperCase()}
        </div>

        <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
          <div className="mb-1 px-1 text-[13px] font-semibold text-[#6f7787]">
            {isUser ? "You" : characterName}
          </div>

          <div
            className={`rounded-[12px] px-4 py-2.5 text-[15px] leading-6 shadow-sm ${
              isUser
                ? "bg-[#232833] text-white"
                : "border border-[rgba(160,170,184,0.35)] bg-[rgba(255,255,255,0.95)] text-[#2b3340]"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        </div>
      </div>
    </div>
  );
}