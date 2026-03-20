"use client";

import { useEffect, useTransition, useState, useRef } from "react";
import { useRouter } from "next/navigation";

type ThreadItem = {
  id: string;
  contact_character_id: string;
  lastMessageAt?: string | null;
  contact?: {
    id: string;
    name: string;
    title: string | null;
    key: string;
    avatar?: string | null;
  } | null;
};

function Avatar({ src, name, size = 36 }: { src?: string | null; name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  if (src) {
    return (
      <img src={src} alt={name} width={size} height={size}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#3a3d4a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, fontWeight: 600, color: "rgba(255,255,255,0.6)", flexShrink: 0 }}>
      {initial}
    </div>
  );
}

const STORAGE_PREFIX = "wavesline_thread_read_";
function getLastRead(threadId: string): string | null {
  try { return localStorage.getItem(STORAGE_PREFIX + threadId); } catch { return null; }
}
function setLastRead(threadId: string, ts?: string) {
  try { localStorage.setItem(STORAGE_PREFIX + threadId, ts ?? new Date().toISOString()); } catch {}
}

export default function ThreadList({
  threads,
  currentThreadId,
}: {
  threads: ThreadItem[];
  currentThreadId?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingThreadId, setPendingThreadId] = useState<string | null>(null);
  const [unreadSet, setUnreadSet] = useState<Set<string>>(new Set());

  // Keep a ref so the event listener always reads the latest currentThreadId
  // without needing to re-register itself (avoids the stale-closure race)
  const currentThreadIdRef = useRef(currentThreadId);
  useEffect(() => {
    currentThreadIdRef.current = currentThreadId;
  }, [currentThreadId]);

  // Compute initial unread from localStorage + SSR data
  useEffect(() => {
    const unread = new Set<string>();
    for (const thread of threads) {
      if (thread.id === currentThreadId) continue;
      const lastRead = getLastRead(thread.id);
      if (!lastRead) {
        if (thread.lastMessageAt) unread.add(thread.id);
      } else if (thread.lastMessageAt && thread.lastMessageAt > lastRead) {
        unread.add(thread.id);
      }
    }
    setUnreadSet(unread);
  }, [threads, currentThreadId]);

  // Mark current thread read whenever it changes
  useEffect(() => {
    if (currentThreadId) {
      setLastRead(currentThreadId);
      setUnreadSet((prev) => {
        const next = new Set(prev);
        next.delete(currentThreadId);
        return next;
      });
      setPendingThreadId((prev) => (prev === currentThreadId ? null : prev));
    }
  }, [currentThreadId]);

  // Single persistent listener — reads currentThreadId from ref, never stale
  useEffect(() => {
    function onNewMessage(e: Event) {
      const { threadId, createdAt } = (e as CustomEvent<{ threadId: string; createdAt: string }>).detail;
      if (threadId === currentThreadIdRef.current) {
        // Currently open — just update last read timestamp
        setLastRead(threadId, createdAt);
        return;
      }
      // Background thread — show unread dot
      setUnreadSet((prev) => new Set([...prev, threadId]));
    }
    window.addEventListener("wavesline:newmessage", onNewMessage);
    return () => window.removeEventListener("wavesline:newmessage", onNewMessage);
  }, []); // empty deps — registered once, reads ref instead of closure

  function navigate(threadId: string) {
    if (threadId === currentThreadId) return;
    setPendingThreadId(threadId);
    startTransition(() => {
      router.push(`/chat?thread=${threadId}`);
    });
  }

  return (
    <>
      <style>{`
        @keyframes unreadPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.4);opacity:.65}}
        @keyframes skshimmer{0%{background-position:-300px 0}100%{background-position:300px 0}}
      `}</style>

      {threads.map((thread) => {
        const isActive = currentThreadId === thread.id;
        const isLoading = pendingThreadId === thread.id && isPending;
        const hasUnread = unreadSet.has(thread.id) && !isActive;

        return (
          <div
            key={thread.id}
            onClick={() => navigate(thread.id)}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "10px 12px",
              background: isActive ? "#ffffff" : "transparent",
              cursor: isLoading ? "wait" : "pointer",
              transition: "background 0.12s ease",
              userSelect: "none",
            }}
            onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
          >
            <div style={{ position: "relative", flexShrink: 0 }}>
              <Avatar src={thread.contact?.avatar} name={thread.contact?.name ?? "?"} size={36} />
              {hasUnread && (
                <span style={{
                  position: "absolute", top: -1, right: -1,
                  width: 10, height: 10, borderRadius: "50%",
                  background: "#ef4444", border: "2px solid #23252f",
                  display: "block",
                  animation: "unreadPulse 2s ease-in-out infinite",
                }} />
              )}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              {isLoading ? (
                <>
                  <div style={{
                    height: 11, width: "60%", borderRadius: 4, marginBottom: 6,
                    background: "linear-gradient(90deg,rgba(255,255,255,0.06) 25%,rgba(255,255,255,0.12) 50%,rgba(255,255,255,0.06) 75%)",
                    backgroundSize: "300px 100%",
                    animation: "skshimmer 1.4s ease-in-out infinite",
                  }} />
                  <div style={{
                    height: 9, width: "40%", borderRadius: 4,
                    background: "linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.09) 50%,rgba(255,255,255,0.04) 75%)",
                    backgroundSize: "300px 100%",
                    animation: "skshimmer 1.4s ease-in-out infinite 0.15s",
                  }} />
                </>
              ) : (
                <>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: isActive ? "#23252f" : "rgba(255,255,255,0.85)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {thread.contact?.name ?? "Unknown"}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: isActive ? "rgba(35,37,47,0.5)" : "rgba(255,255,255,0.35)",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {thread.contact?.title ?? thread.contact?.key ?? ""}
                  </div>
                </>
              )}
            </div>

            {isLoading && (
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none"
                style={{ flexShrink: 0, animation: "spin 0.8s linear infinite" }}>
                <circle cx="7" cy="7" r="5" stroke="rgba(255,255,255,0.35)"
                  strokeWidth="1.8" strokeDasharray="18" strokeDashoffset="9" strokeLinecap="round" />
              </svg>
            )}
          </div>
        );
      })}
    </>
  );
}