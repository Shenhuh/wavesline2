"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/lib/chat/types";
import MessageBubble from "./MessageBubble";

type ChatMessagesProps = {
  messages: ChatMessage[];
  characterName: string;
  isLoading?: boolean;
};

export default function ChatMessages({
  messages,
  characterName,
  isLoading = false,
}: ChatMessagesProps) {
  return (
    <div className="min-h-0 flex-1 bg-[linear-gradient(180deg,rgba(248,249,251,0.60),rgba(241,244,248,0.64))]">
      <ScrollArea className="h-full w-full">
        <div className="mx-auto flex w-full max-w-4xl flex-col px-8 py-6">
          <div className="mb-6 text-center text-[13px] font-semibold text-[#8a93a3]">
            You&apos;re now friends with {characterName}
          </div>

          <div className="space-y-5">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                characterName={characterName}
              />
            ))}

            {isLoading && (
              <div className="flex w-full justify-start">
                <div className="flex max-w-[78%] items-end gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(160,170,184,0.35)] bg-[rgba(255,255,255,0.92)] text-xs font-bold text-[#7b869a] shadow-sm">
                    {characterName.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="flex flex-col items-start">
                    <div className="mb-1 px-1 text-[13px] font-semibold text-[#6f7787]">
                      {characterName}
                    </div>

                    <div className="rounded-[12px] border border-[rgba(160,170,184,0.35)] bg-[rgba(255,255,255,0.95)] px-4 py-3 text-[#2b3340] shadow-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#98a2b3] animate-pulse" />
                        <span className="h-2 w-2 rounded-full bg-[#98a2b3] animate-pulse [animation-delay:150ms]" />
                        <span className="h-2 w-2 rounded-full bg-[#98a2b3] animate-pulse [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}