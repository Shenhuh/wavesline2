import { supabase } from "@/lib/supabase";
import type { ChatMessage, ChatRole } from "@/lib/chat/types";

type DbChatMessageRow = {
  id: string;
  session_id: string;
  character_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
};

export async function fetchMessagesForCharacter(
  sessionId: string,
  characterId: string
): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, session_id, character_id, role, content, created_at")
    .eq("session_id", sessionId)
    .eq("character_id", characterId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch messages:", error);
    throw error;
  }

  return ((data ?? []) as DbChatMessageRow[]).map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
  }));
}

export async function saveMessage(params: {
  sessionId: string;
  characterId: string;
  role: ChatRole;
  content: string;
}) {
  const { sessionId, characterId, role, content } = params;

  const { error } = await supabase.from("chat_messages").insert({
    session_id: sessionId,
    character_id: characterId,
    role,
    content,
  });

  if (error) {
    console.error("Failed to save message:", error);
    throw error;
  }
}

export async function clearMessagesForCharacter(
  sessionId: string,
  characterId: string
) {
  const { error, data } = await supabase
    .from("chat_messages")
    .delete()
    .eq("session_id", sessionId)
    .eq("character_id", characterId)
    .select("id");

  if (error) {
    console.error("Failed to clear messages:", error);
    throw error;
  }

  return data ?? [];
}