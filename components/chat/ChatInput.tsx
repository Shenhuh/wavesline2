"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ChatInputProps = {
  onSend: (value: string) => Promise<void> | void;
  disabled?: boolean;
};

export default function ChatInput({
  onSend,
  disabled = false,
}: ChatInputProps) {
  const [value, setValue] = useState("");

  async function handleSend() {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;

    setValue("");
    await onSend(trimmed);
  }

  return (
    <div className="border-t border-[rgba(160,170,184,0.35)] bg-[linear-gradient(180deg,rgba(240,243,247,0.86),rgba(231,235,241,0.90))] px-6 py-4">
      <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
        <Input
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              void handleSend();
            }
          }}
          placeholder={disabled ? "Waiting for reply..." : "Type a message..."}
          className="h-12 rounded-full border border-[rgba(160,170,184,0.45)] bg-[rgba(255,255,255,0.95)] px-5 text-[15px] text-[#2b3340] shadow-sm focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-70"
        />

        <Button
          type="button"
          disabled={disabled}
          onClick={() => {
            void handleSend();
          }}
          className="h-11 rounded-full bg-[#e9edf3] px-6 text-[#2a313d] shadow-sm ring-1 ring-[rgba(160,170,184,0.45)] hover:bg-[#dde3eb] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {disabled ? "..." : "Send"}
        </Button>
      </div>
    </div>
  );
}