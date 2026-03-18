"use client";

import { useState } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");

  function sendMessage() {
    if (!input.trim()) return;

    setMessages((prev) => [...prev, input]);
    setInput("");
  }

  return (
    <div className="flex h-screen bg-black text-white">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-800 p-4">
        <h2 className="text-xl font-bold mb-4">Characters</h2>
        <div className="space-y-2">
          <button className="w-full text-left p-2 bg-gray-800 rounded">
            Phrolova
          </button>
          <button className="w-full text-left p-2 bg-gray-800 rounded">
            Luuk
          </button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((msg, i) => (
            <div key={i} className="bg-gray-800 p-2 rounded">
              {msg}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-800 flex gap-2">
          <input
            className="flex-1 p-2 bg-gray-900 rounded outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-blue-600 rounded"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}