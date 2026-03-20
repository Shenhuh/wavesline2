// lib/chat/app-chat.ts

import { createAdminClient } from "@/lib/supabase/admin";

export type CharacterOption = {
  id: string;
  key: string;
  name: string;
  title: string | null;
  avatar: string | null;
  starter_message: string | null;
  block_message: string | null;
  annoyance_threshold: number | null;
  voice_only: boolean | null;
  auto_play_voice: boolean | null;
  preferred_voice: string | null;
  sticker_enabled: boolean | null;
  sticker_base_chance: number | null;
  sticker_mood_influence: number | null;
};

export type ContactOption = {
  id: string;
  key: string;
  name: string;
  title: string | null;
  avatar: string | null;
};

export type ChatThreadRow = {
  id: string;
  user_id: string;
  active_character_id: string;
  contact_character_id: string;
  created_at: string;
  updated_at: string;
};

export type ChatThreadWithContact = ChatThreadRow & {
  contact: ContactOption | null;
};

export type ChatMessageSticker = {
  id: string;
  key: string;
  label: string;
  image_path: string;
} | null;

export type ChatMessageRow = {
  id: string;
  thread_id: string;
  sender_role: "active" | "contact";
  content: string | null;
  created_at: string;
  message_type: "text" | "sticker";
  sticker_id: string | null;
  sticker: ChatMessageSticker;
};

export type ChatThreadStateRow = {
  thread_id: string;
  affinity: number;
  annoyance: number;
  trust: number;
  familiarity: number;
  mood: string;
  blocked: boolean;
  message_count: number;
  updated_at?: string;
};

const CHARACTER_SELECT = `
  id,
  key,
  name,
  title,
  avatar,
  starter_message,
  block_message,
  annoyance_threshold,
  voice_only,
  auto_play_voice,
  preferred_voice,
  sticker_enabled,
  sticker_base_chance,
  sticker_mood_influence
`;

export async function listCharacters(): Promise<CharacterOption[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("characters")
    .select(CHARACTER_SELECT)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as CharacterOption[];
}

export async function getCharacterById(
  id: string
): Promise<CharacterOption | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("characters")
    .select(CHARACTER_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data as CharacterOption | null) ?? null;
}

export async function getUserActiveCharacterId(
  userId: string
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("user_active_characters")
    .select("character_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data?.character_id as string | undefined) ?? null;
}

export async function getContactsForActiveCharacter(
  userId: string,
  activeCharacterId: string
): Promise<ContactOption[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("chat_threads")
    .select(`
      id,
      contact:characters!chat_threads_contact_character_id_fkey (
        id,
        key,
        name,
        title,
        avatar
      )
    `)
    .eq("user_id", userId)
    .eq("active_character_id", activeCharacterId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  const contacts = (data ?? [])
    .map((row: any) => row.contact)
    .filter(Boolean) as ContactOption[];

  const seen = new Set<string>();
  const unique: ContactOption[] = [];

  for (const contact of contacts) {
    if (seen.has(contact.id)) continue;
    seen.add(contact.id);
    unique.push(contact);
  }

  return unique;
}

export async function listThreadsForUser(
  userId: string,
  activeCharacterId: string
): Promise<ChatThreadWithContact[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("chat_threads")
    .select(`
      id,
      user_id,
      active_character_id,
      contact_character_id,
      created_at,
      updated_at,
      contact:characters!chat_threads_contact_character_id_fkey (
        id,
        key,
        name,
        title,
        avatar
      )
    `)
    .eq("user_id", userId)
    .eq("active_character_id", activeCharacterId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    active_character_id: row.active_character_id,
    contact_character_id: row.contact_character_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    contact: Array.isArray(row.contact) ? row.contact[0] ?? null : row.contact,
  }));
}

export async function getThreadForUser(args: {
  userId: string;
  activeCharacterId: string;
  threadId: string;
}): Promise<ChatThreadWithContact | null> {
  const { userId, activeCharacterId, threadId } = args;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("chat_threads")
    .select(`
      id,
      user_id,
      active_character_id,
      contact_character_id,
      created_at,
      updated_at,
      contact:characters!chat_threads_contact_character_id_fkey (
        id,
        key,
        name,
        title,
        avatar
      )
    `)
    .eq("id", threadId)
    .eq("user_id", userId)
    .eq("active_character_id", activeCharacterId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const row: any = data;

  return {
    id: row.id,
    user_id: row.user_id,
    active_character_id: row.active_character_id,
    contact_character_id: row.contact_character_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    contact: Array.isArray(row.contact) ? row.contact[0] ?? null : row.contact,
  };
}

export async function listMessages(
  threadId: string
): Promise<ChatMessageRow[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("chat_messages")
    .select(`
      id,
      thread_id,
      sender_role,
      content,
      created_at,
      message_type,
      sticker_id,
      sticker:stickers (
        id,
        key,
        label,
        image_path
      )
    `)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    thread_id: row.thread_id,
    sender_role: row.sender_role,
    content: row.content,
    created_at: row.created_at,
    message_type: row.message_type ?? "text",
    sticker_id: row.sticker_id ?? null,
    sticker: Array.isArray(row.sticker) ? row.sticker[0] ?? null : row.sticker,
  }));
}

export async function getThreadRuntimeState(
  threadId: string
): Promise<ChatThreadStateRow | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("chat_thread_states")
    .select(
      "thread_id, affinity, annoyance, trust, familiarity, mood, blocked, message_count, updated_at"
    )
    .eq("thread_id", threadId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (data as ChatThreadStateRow | null) ?? null;
}

export async function upsertThreadRuntimeState(args: {
  threadId: string;
  affinity: number;
  annoyance: number;
  trust: number;
  familiarity: number;
  mood: string;
  blocked: boolean;
  messageCount: number;
}) {
  const supabase = createAdminClient();

  const payload = {
    thread_id: args.threadId,
    affinity: args.affinity,
    annoyance: args.annoyance,
    trust: args.trust,
    familiarity: args.familiarity,
    mood: args.mood,
    blocked: args.blocked,
    message_count: args.messageCount,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("chat_thread_states")
    .upsert(payload, { onConflict: "thread_id" });

  if (error) throw new Error(error.message);
}

export async function resetThreadConversation(args: {
  userId: string;
  activeCharacterId: string;
  threadId: string;
}) {
  const { userId, activeCharacterId, threadId } = args;
  const supabase = createAdminClient();

  const thread = await getThreadForUser({
    userId,
    activeCharacterId,
    threadId,
  });

  if (!thread) {
    throw new Error("Thread not found.");
  }

  const { error: messagesError } = await supabase
    .from("chat_messages")
    .delete()
    .eq("thread_id", threadId);

  if (messagesError) {
    throw new Error(messagesError.message);
  }

  const { error: threadUpdateError } = await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  if (threadUpdateError) {
    throw new Error(threadUpdateError.message);
  }

  return true;
}