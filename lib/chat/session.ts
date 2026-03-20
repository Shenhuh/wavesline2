const SESSION_STORAGE_KEY = "wavesline_session_id";

export function getOrCreateSessionId() {
  if (typeof window === "undefined") return "";

  let sessionId = localStorage.getItem("wavesline_session");

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem("wavesline_session", sessionId);
  }

  return sessionId;
}