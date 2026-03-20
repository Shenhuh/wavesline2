import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createReplyPlannerPrompt,
  normalizeModelReply,
  isWeakCharacterReply,
  buildRepairPrompt,
} from "@/lib/chat/reply-orchestrator";
import { plannerProfiles } from "@/lib/chat/planner-config";
import {
  applyAssistantReplyEffects,
  applyBlockingRule,
  deriveNextThreadRuntimeState,
  seedRuntimeStateFromRelationship,
} from "@/lib/chat/runtime-thread-state";
import {
  getThreadRuntimeState,
  upsertThreadRuntimeState,
} from "@/lib/chat/app-chat";
import {
  buildEventContextBlock,
  getRelevantEventsForCharacter,
} from "@/lib/chat/events";
import {
  buildMonsterContextBlock,
  searchRelevantMonsters,
} from "@/lib/chat/monsters";
import { chooseStickerForAiReply } from "@/lib/chat/sticker-ai";

type CharacterRow = {
  id: string;
  key: string;
  name: string;
  title: string | null;
  starter_message: string | null;
  base_tone: string | null;
  style_notes: string[] | null;
  likes: string[] | null;
  dislikes: string[] | null;
  allowed_modes: string[] | null;
  identity_notes: string | null;
  conversation_rules: string | null;
  relationship_behavior: string | null;
  lore_context: string | null;
  hard_constraints: string | null;
  annoyance_threshold: number;
  block_message: string | null;
  sticker_enabled: boolean;
  sticker_base_chance: number;
  sticker_mood_influence: number;
};

type ThreadRow = {
  id: string;
  user_id: string;
  active_character_id: string;
  contact_character_id: string;
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_role: "active" | "contact";
  content: string | null;
  created_at: string;
  message_type?: "text" | "sticker";
  sticker_id?: string | null;
  sticker?: {
    id: string;
    key: string;
    label: string;
    image_path: string;
  } | null;
};

type RelationshipRow = {
  id: string;
  relationship_label: string | null;
  affinity: number;
  trust: number;
  familiarity: number;
  notes: string | null;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "deepseek/deepseek-chat";
const MAX_HISTORY = 18;

function arr(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function extractReply(data: OpenRouterResponse): string {
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

function mapDbCharacterToPlannerProfile(character: CharacterRow) {
  const fallback = plannerProfiles[character.key] ?? plannerProfiles["phrolova"];

  return {
    key: character.key,
    name: character.name,
    baseTone:
      (character.base_tone as
        | "warm"
        | "neutral"
        | "cold"
        | "playful"
        | "concerned"
        | "annoyed"
        | "curious"
        | "guarded"
        | undefined) ??
      fallback?.baseTone ??
      "neutral",
    defaultReplyLength: fallback?.defaultReplyLength ?? "medium",
    styleNotes:
      arr(character.style_notes).length > 0
        ? arr(character.style_notes)
        : fallback?.styleNotes ?? [],
    likes:
      arr(character.likes).length > 0
        ? arr(character.likes)
        : fallback?.likes ?? [],
    dislikes:
      arr(character.dislikes).length > 0
        ? arr(character.dislikes)
        : fallback?.dislikes ?? [],
    allowedModes:
      arr(character.allowed_modes).length > 0
        ? (arr(character.allowed_modes) as Array<
            | "direct_answer"
            | "brief_answer"
            | "question_back"
            | "tease_then_answer"
            | "comfort"
            | "deflect"
            | "guarded_answer"
            | "lore_explain"
            | "challenge"
            | "romantic_soft"
            | "meta_boundary"
            | "observe_then_answer"
          >)
        : fallback?.allowedModes,
  };
}

function buildPlannerRelationshipState(input: {
  affinity: number;
  annoyance: number;
  trust: number;
  familiarity: number;
  mood: string;
  blocked: boolean;
}) {
  return {
    affinity: input.affinity,
    annoyance: input.annoyance,
    trust: input.trust,
    familiarity: input.familiarity,
    mood: input.mood,
    blocked: input.blocked,
  };
}

function buildHistory(messages: MessageRow[]) {
  return messages
    .filter((m) => m.message_type !== "sticker")
    .map((m) => ({
      role: m.sender_role === "active" ? ("user" as const) : ("assistant" as const),
      content: m.content ?? "",
    }));
}

function buildWorldContext(args: {
  activeCharacter: CharacterRow;
  contactCharacter: CharacterRow;
  relationship: RelationshipRow | null;
  runtimeState: {
    affinity: number;
    annoyance: number;
    trust: number;
    familiarity: number;
    mood: string;
    blocked: boolean;
    messageCount: number;
  };
  eventContext: string;
  monsterContext: string;
}) {
  const {
    activeCharacter,
    contactCharacter,
    relationship,
    runtimeState,
    eventContext,
    monsterContext,
  } = args;

  const pieces: string[] = [];

  pieces.push(
    `This is a one-on-one text chat app. The user is portraying ${activeCharacter.name}.`
  );
  pieces.push(
    `You are ${contactCharacter.name}. Speak directly to ${activeCharacter.name} in chat.`
  );
  pieces.push("Do not speak as an assistant.");
  pieces.push("Do not use markdown.");
  pieces.push("Do not narrate actions, body language, lighting, or shared space.");
  pieces.push("Do not use asterisks or roleplay stage directions.");
  pieces.push("Keep the reply natural, direct, and suited for chat.");
  pieces.push(
    "When answering about monsters, you must stay consistent with the same entity and not switch to another."
  );

  if (contactCharacter.title) {
    pieces.push(`${contactCharacter.name}'s title: ${contactCharacter.title}.`);
  }

  if (relationship) {
    pieces.push(
      `${contactCharacter.name}'s stored relationship toward ${activeCharacter.name}: ` +
        `label=${relationship.relationship_label ?? "unspecified"}, ` +
        `affinity=${relationship.affinity}, trust=${relationship.trust}, familiarity=${relationship.familiarity}.`
    );

    if (relationship.notes?.trim()) {
      pieces.push(`Stored relationship notes: ${relationship.notes.trim()}`);
    }
  } else {
    pieces.push(
      `${contactCharacter.name} has no stored relationship entry toward ${activeCharacter.name}.`
    );
  }

  pieces.push(
    `Live thread state right now: affinity=${runtimeState.affinity}, annoyance=${runtimeState.annoyance}, trust=${runtimeState.trust}, familiarity=${runtimeState.familiarity}, mood=${runtimeState.mood}, blocked=${runtimeState.blocked}, message_count=${runtimeState.messageCount}.`
  );

  if (eventContext.trim()) {
    pieces.push(eventContext);
  }

  if (monsterContext.trim()) {
    pieces.push(monsterContext);
  }

  return pieces.join("\n\n");
}

function logTokenUsage(args: {
  stage: "first-pass" | "repair-pass";
  model: string;
  threadId: string;
  character: string;
  usage?: OpenRouterResponse["usage"];
}) {
  const usage = args.usage;

  if (!usage) {
    console.log("[token-usage]", {
      stage: args.stage,
      model: args.model,
      threadId: args.threadId,
      character: args.character,
      prompt_tokens: null,
      completion_tokens: null,
      total_tokens: null,
    });
    return;
  }

  console.log("[token-usage]", {
    stage: args.stage,
    model: args.model,
    threadId: args.threadId,
    character: args.character,
    prompt_tokens: usage.prompt_tokens ?? null,
    completion_tokens: usage.completion_tokens ?? null,
    total_tokens: usage.total_tokens ?? null,
  });
}

function logCombinedTokenUsage(args: {
  model: string;
  threadId: string;
  character: string;
  firstUsage?: OpenRouterResponse["usage"];
  repairUsage?: OpenRouterResponse["usage"];
}) {
  const promptTokens =
    (args.firstUsage?.prompt_tokens ?? 0) + (args.repairUsage?.prompt_tokens ?? 0);
  const completionTokens =
    (args.firstUsage?.completion_tokens ?? 0) +
    (args.repairUsage?.completion_tokens ?? 0);
  const totalTokens =
    (args.firstUsage?.total_tokens ?? 0) + (args.repairUsage?.total_tokens ?? 0);

  console.log("[token-usage:combined-message]", {
    model: args.model,
    threadId: args.threadId,
    character: args.character,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
  });
}

async function getThreadData(threadId: string) {
  const supabase = createAdminClient();

  const { data: thread, error: threadError } = await supabase
    .from("chat_threads")
    .select("*")
    .eq("id", threadId)
    .single();

  if (threadError || !thread) {
    throw new Error(threadError?.message || "Thread not found.");
  }

  const threadRow = thread as ThreadRow;

  const [
    activeCharacterResult,
    contactCharacterResult,
    messagesResult,
    relationshipResult,
  ] = await Promise.all([
    supabase.from("characters").select("*").eq("id", threadRow.active_character_id).single(),
    supabase.from("characters").select("*").eq("id", threadRow.contact_character_id).single(),
    supabase
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
      .order("created_at", { ascending: true }),
    supabase
      .from("character_relationships")
      .select("*")
      .eq("source_character_id", threadRow.contact_character_id)
      .eq("target_character_id", threadRow.active_character_id)
      .maybeSingle(),
  ]);

  if (activeCharacterResult.error || !activeCharacterResult.data) {
    throw new Error(activeCharacterResult.error?.message || "Active character not found.");
  }

  if (contactCharacterResult.error || !contactCharacterResult.data) {
    throw new Error(contactCharacterResult.error?.message || "Contact character not found.");
  }

  if (messagesResult.error) {
    throw new Error(messagesResult.error.message);
  }

  if (relationshipResult.error) {
    throw new Error(relationshipResult.error.message);
  }

  const normalizedMessages = ((messagesResult.data ?? []) as any[]).map((row) => ({
    id: row.id,
    thread_id: row.thread_id,
    sender_role: row.sender_role,
    content: row.content,
    created_at: row.created_at,
    message_type: row.message_type ?? "text",
    sticker_id: row.sticker_id ?? null,
    sticker: Array.isArray(row.sticker) ? row.sticker[0] ?? null : row.sticker,
  })) as MessageRow[];

  return {
    supabase,
    thread: threadRow,
    activeCharacter: activeCharacterResult.data as CharacterRow,
    contactCharacter: contactCharacterResult.data as CharacterRow,
    messages: normalizedMessages.slice(-MAX_HISTORY),
    relationship: (relationshipResult.data ?? null) as RelationshipRow | null,
  };
}

async function insertTextMessage(args: {
  supabase: ReturnType<typeof createAdminClient>;
  threadId: string;
  senderRole: "active" | "contact";
  content: string;
}) {
  const { supabase, threadId, senderRole, content } = args;

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      sender_role: senderRole,
      content,
      message_type: "text",
      sticker_id: null,
    })
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
    .single();

  if (error) throw new Error(error.message);

  const normalized = {
    ...(data as any),
    sticker: Array.isArray((data as any).sticker)
      ? (data as any).sticker[0] ?? null
      : (data as any).sticker,
  } as MessageRow;

  const { error: threadError } = await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  if (threadError) throw new Error(threadError.message);

  return normalized;
}

async function insertStickerMessage(args: {
  supabase: ReturnType<typeof createAdminClient>;
  threadId: string;
  senderRole: "active" | "contact";
  stickerId: string;
}) {
  const { supabase, threadId, senderRole, stickerId } = args;

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      sender_role: senderRole,
      content: null,
      message_type: "sticker",
      sticker_id: stickerId,
    })
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
    .single();

  if (error) throw new Error(error.message);

  const normalized = {
    ...(data as any),
    sticker: Array.isArray((data as any).sticker)
      ? (data as any).sticker[0] ?? null
      : (data as any).sticker,
  } as MessageRow;

  const { error: threadError } = await supabase
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  if (threadError) throw new Error(threadError.message);

  return normalized;
}

async function callOpenRouter(args: {
  apiKey: string;
  model: string;
  prompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
}) {
  const { apiKey, model, prompt, temperature, topP, maxTokens } = args;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
      "X-Title": "Wavesline Chatbot",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: prompt }],
      temperature,
      top_p: topP,
      max_tokens: maxTokens,
    }),
  });

  const data = (await response.json()) as OpenRouterResponse;

  return {
    response,
    data,
    reply: normalizeModelReply(extractReply(data)),
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const threadId = String(body.threadId ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!threadId || !message) {
      return NextResponse.json(
        { error: "Missing threadId or message." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENROUTER_API_KEY." },
        { status: 500 }
      );
    }

    const {
      supabase,
      activeCharacter,
      contactCharacter,
      messages,
      relationship,
    } = await getThreadData(threadId);

    const existingRuntimeState = await getThreadRuntimeState(threadId);

    const seededState = existingRuntimeState
      ? {
          affinity: existingRuntimeState.affinity,
          annoyance: existingRuntimeState.annoyance,
          trust: existingRuntimeState.trust,
          familiarity: existingRuntimeState.familiarity,
          mood: existingRuntimeState.mood,
          blocked: existingRuntimeState.blocked,
          messageCount: existingRuntimeState.message_count,
          lastStickerAt: (existingRuntimeState as any).last_sticker_at ?? null,
        }
      : {
          ...seedRuntimeStateFromRelationship(relationship),
          lastStickerAt: null,
        };

    const alreadyBlockedState = applyBlockingRule({
      state: seededState,
      annoyanceThreshold: contactCharacter.annoyance_threshold ?? 85,
    });

    if (alreadyBlockedState.blocked) {
      await upsertThreadRuntimeState({
        threadId,
        affinity: alreadyBlockedState.affinity,
        annoyance: alreadyBlockedState.annoyance,
        trust: alreadyBlockedState.trust,
        familiarity: alreadyBlockedState.familiarity,
        mood: alreadyBlockedState.mood,
        blocked: true,
        messageCount: alreadyBlockedState.messageCount,
      });

      return NextResponse.json(
        {
          error: contactCharacter.block_message || "This conversation is over.",
          blocked: true,
        },
        { status: 403 }
      );
    }

    const nextRuntimeState = deriveNextThreadRuntimeState(seededState, message);

    await upsertThreadRuntimeState({
      threadId,
      affinity: nextRuntimeState.affinity,
      annoyance: nextRuntimeState.annoyance,
      trust: nextRuntimeState.trust,
      familiarity: nextRuntimeState.familiarity,
      mood: nextRuntimeState.mood,
      blocked: nextRuntimeState.blocked,
      messageCount: nextRuntimeState.messageCount,
    });

    const savedUserMessage = await insertTextMessage({
      supabase,
      threadId,
      senderRole: "active",
      content: message,
    });

    const updatedHistory = [...messages, savedUserMessage].slice(-MAX_HISTORY);

    const plannerCharacter = mapDbCharacterToPlannerProfile(contactCharacter);
    const plannerRelationship = buildPlannerRelationshipState(nextRuntimeState);
    const history = buildHistory(updatedHistory);

    const [events, monsters] = await Promise.all([
      getRelevantEventsForCharacter({
        characterKey: contactCharacter.key,
        limit: 5,
      }),
      searchRelevantMonsters({
        message,
        limit: 5,
      }),
    ]);

    const eventContext = buildEventContextBlock(events);
    const monsterContext = buildMonsterContextBlock(monsters, message);

    const worldContext = buildWorldContext({
      activeCharacter,
      contactCharacter,
      relationship,
      runtimeState: nextRuntimeState,
      eventContext,
      monsterContext,
    });

    const { plan, prompt, memorySummary, modelSettings } =
      createReplyPlannerPrompt({
        message,
        history,
        relationship: plannerRelationship,
        character: plannerCharacter,
        worldContext,
        extraCharacterContext: {
          identityNotes: contactCharacter.identity_notes,
          conversationRules: contactCharacter.conversation_rules,
          relationshipBehavior: contactCharacter.relationship_behavior,
          loreContext: contactCharacter.lore_context,
          hardConstraints: contactCharacter.hard_constraints,
        },
      });

    const model = DEFAULT_MODEL;

    const firstPass = await callOpenRouter({
      apiKey,
      model,
      prompt,
      temperature: modelSettings.temperature,
      topP: modelSettings.topP,
      maxTokens: modelSettings.maxTokens,
    });

    logTokenUsage({
      stage: "first-pass",
      model,
      threadId,
      character: contactCharacter.name,
      usage: firstPass.data?.usage,
    });

    if (!firstPass.response.ok) {
      console.error("[openrouter-error:first-pass]", firstPass.data);
      return NextResponse.json(
        {
          error: firstPass.data?.error?.message || "OpenRouter request failed.",
        },
        { status: firstPass.response.status }
      );
    }

    let reply = firstPass.reply;
    let repaired = false;
    let repairUsage: OpenRouterResponse["usage"] | undefined;

    if (isWeakCharacterReply(reply)) {
      const repairPrompt = buildRepairPrompt({
        originalPrompt: prompt,
        badReply: reply,
        plan,
        character: plannerCharacter,
      });

      const secondPass = await callOpenRouter({
        apiKey,
        model,
        prompt: repairPrompt,
        temperature: Math.min(modelSettings.temperature + 0.06, 0.92),
        topP: modelSettings.topP,
        maxTokens: modelSettings.maxTokens,
      });

      repairUsage = secondPass.data?.usage;

      logTokenUsage({
        stage: "repair-pass",
        model,
        threadId,
        character: contactCharacter.name,
        usage: secondPass.data?.usage,
      });

      if (secondPass.response.ok) {
        const retryReply = secondPass.reply;
        if (retryReply && !isWeakCharacterReply(retryReply)) {
          reply = retryReply;
          repaired = true;
        }
      } else {
        console.error("[openrouter-error:repair-pass]", secondPass.data);
      }
    }

    logCombinedTokenUsage({
      model,
      threadId,
      character: contactCharacter.name,
      firstUsage: firstPass.data?.usage,
      repairUsage,
    });

    const preFinalRuntimeState = applyAssistantReplyEffects(nextRuntimeState, reply);

    const finalRuntimeState = applyBlockingRule({
      state: preFinalRuntimeState,
      annoyanceThreshold: contactCharacter.annoyance_threshold ?? 85,
    });

    if (finalRuntimeState.blocked) {
      reply =
        contactCharacter.block_message ||
        "This conversation is over. Do not message me again.";
    }

    const replyMessage = await insertTextMessage({
      supabase,
      threadId,
      senderRole: "contact",
      content: reply,
    });

    let stickerReplyMessage: MessageRow | null = null;

    if (!finalRuntimeState.blocked && replyMessage.content) {
      const stickerChoice = await chooseStickerForAiReply({
        userMessage: message,
        replyText: replyMessage.content,
        mood: finalRuntimeState.mood,
        lastStickerAt: (seededState as any).lastStickerAt ?? null,
        stickerEnabled: contactCharacter.sticker_enabled ?? false,
        stickerBaseChance: Number(contactCharacter.sticker_base_chance ?? 0.12),
        stickerMoodInfluence: Number(contactCharacter.sticker_mood_influence ?? 0.12),
      });

      if (stickerChoice) {
        try {
          stickerReplyMessage = await insertStickerMessage({
            supabase,
            threadId,
            senderRole: "contact",
            stickerId: stickerChoice.id,
          });

          const { error: stickerStateError } = await supabase
            .from("chat_thread_states")
            .update({
              last_sticker_at: new Date().toISOString(),
            })
            .eq("thread_id", threadId);

          if (stickerStateError) {
            console.error("[chat-sticker-state-error]", stickerStateError);
          }
        } catch (stickerError) {
          console.error("[chat-sticker-reply-error]", stickerError);
        }
      }
    }

    await upsertThreadRuntimeState({
      threadId,
      affinity: finalRuntimeState.affinity,
      annoyance: finalRuntimeState.annoyance,
      trust: finalRuntimeState.trust,
      familiarity: finalRuntimeState.familiarity,
      mood: finalRuntimeState.mood,
      blocked: finalRuntimeState.blocked,
      messageCount: finalRuntimeState.messageCount,
    });

    return NextResponse.json({
      ok: true,
      repaired,
      blocked: finalRuntimeState.blocked,
      blockMessage: finalRuntimeState.blocked
        ? contactCharacter.block_message || "This conversation is over."
        : null,
      savedUserMessage,
      replyMessage,
      stickerReplyMessage,
      debug: {
        plan,
        runtimeState: finalRuntimeState,
        relationship: plannerRelationship,
        memorySummary,
        modelSettings,
        activeCharacter: activeCharacter.name,
        contactCharacter: contactCharacter.name,
        events: events.map((e) => ({
          title: e.title,
          status: e.status,
          importance: e.importance,
        })),
        monsters: monsters.map((m) => ({
          name: m.name,
          class: m.class,
          element: m.element,
          location: m.location,
        })),
        tokenUsage: {
          firstPass: firstPass.data?.usage ?? null,
          repairPass: repairUsage ?? null,
          combined: {
            prompt_tokens:
              (firstPass.data?.usage?.prompt_tokens ?? 0) +
              (repairUsage?.prompt_tokens ?? 0),
            completion_tokens:
              (firstPass.data?.usage?.completion_tokens ?? 0) +
              (repairUsage?.completion_tokens ?? 0),
            total_tokens:
              (firstPass.data?.usage?.total_tokens ?? 0) +
              (repairUsage?.total_tokens ?? 0),
          },
        },
      },
    });
  } catch (error) {
    console.error("[chat-api-error]", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}