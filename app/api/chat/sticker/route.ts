// app/api/chat/sticker/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStickerById } from "@/lib/chat/stickers";
import {
  getThreadRuntimeState,
  upsertThreadRuntimeState,
} from "@/lib/chat/app-chat";
import {
  applyAssistantReplyEffects,
  applyBlockingRule,
  deriveNextThreadRuntimeState,
  seedRuntimeStateFromRelationship,
} from "@/lib/chat/runtime-thread-state";
import {
  createReplyPlannerPrompt,
  normalizeModelReply,
  isWeakCharacterReply,
  buildRepairPrompt,
} from "@/lib/chat/reply-orchestrator";
import { plannerProfiles } from "@/lib/chat/planner-config";
import { chooseStickerForAiReply } from "@/lib/chat/sticker-ai";
import {
  buildEventContextBlock,
  getRelevantEventsForCharacter,
} from "@/lib/chat/events";
import {
  buildMonsterContextBlock,
  searchRelevantMonsters,
} from "@/lib/chat/monsters";

const DEEPSEEK_URL = "https://api.deepseek.com/v1/chat/completions";
const DEFAULT_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const MAX_HISTORY = 18;

function extractReply(data: any): string {
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

async function callDeepSeek(args: {
  apiKey: string;
  model: string;
  prompt: string;
  temperature: number;
  topP: number;
  maxTokens: number;
}) {
  const { apiKey, model, prompt, temperature, topP, maxTokens } = args;
  const response = await fetch(DEEPSEEK_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: prompt }],
      temperature,
      top_p: topP,
      max_tokens: maxTokens,
    }),
  });
  const data = await response.json();
  return { response, data, reply: normalizeModelReply(extractReply(data)) };
}

function mapCharacterToProfile(character: any) {
  const fallback = plannerProfiles[character.key] ?? plannerProfiles["phrolova"];
  return {
    key: character.key,
    name: character.name,
    baseTone: character.base_tone ?? fallback?.baseTone ?? "neutral",
    defaultReplyLength: fallback?.defaultReplyLength ?? "medium",
    styleNotes: character.style_notes?.length ? character.style_notes : fallback?.styleNotes ?? [],
    likes: character.likes?.length ? character.likes : fallback?.likes ?? [],
    dislikes: character.dislikes?.length ? character.dislikes : fallback?.dislikes ?? [],
    allowedModes: character.allowed_modes?.length ? character.allowed_modes : fallback?.allowedModes,
  };
}

function resolveActiveForm(character: any, mood: string): { name: string; avatar: string | null } {
  const forms = character.forms;
  if (!forms || forms.length === 0) return { name: character.name, avatar: null };
  const moodMatch = forms.filter((f: any) => f.trigger_type === "mood")
    .find((f: any) => (f.mood_triggers ?? []).some((t: string) => t.toLowerCase() === mood.toLowerCase()));
  if (moodMatch) return { name: moodMatch.display_name || character.name, avatar: moodMatch.avatar || null };
  for (const form of forms.filter((f: any) => f.trigger_type === "random")) {
    if (Math.random() < Number(form.chance ?? 0)) {
      return { name: form.display_name || character.name, avatar: form.avatar || null };
    }
  }
  return { name: character.name, avatar: null };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const threadId = String(body.threadId ?? "").trim();
    const stickerId = String(body.stickerId ?? "").trim();

    if (!threadId || !stickerId) {
      return NextResponse.json(
        { error: "Missing threadId or stickerId." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const admin = createAdminClient();

    const { data: thread, error: threadError } = await admin
      .from("chat_threads")
      .select("id, user_id")
      .eq("id", threadId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (threadError) {
      return NextResponse.json({ error: threadError.message }, { status: 500 });
    }

    if (!thread) {
      return NextResponse.json({ error: "Thread not found." }, { status: 404 });
    }

    const sticker = await getStickerById(stickerId);
    if (!sticker) {
      return NextResponse.json({ error: "Sticker not found." }, { status: 404 });
    }

    const { data: savedMessage, error: insertError } = await admin
      .from("chat_messages")
      .insert({
        thread_id: threadId,
        sender_role: "active",
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
        resolved_name,
        resolved_avatar,
        sticker:stickers (
          id,
          key,
          label,
          image_path
        )
      `)
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    const { error: updateThreadError } = await admin
      .from("chat_threads")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", threadId);

    if (updateThreadError) {
      return NextResponse.json(
        { error: updateThreadError.message },
        { status: 500 }
      );
    }

    const normalizedSavedMessage = {
      ...savedMessage,
      sticker: Array.isArray((savedMessage as any).sticker)
        ? (savedMessage as any).sticker[0] ?? null
        : (savedMessage as any).sticker,
      resolved_name: null,
      resolved_avatar: null,
    };

    // --- AI reply to sticker ---
    const apiKey = process.env.DEEPSEEK_API_KEY;
    let replyMessage = null;
    let stickerReplyMessage = null;

    if (apiKey) {
      try {
        const { data: threadFull } = await admin.from("chat_threads").select("*").eq("id", threadId).single();
        const [{ data: activeChar }, { data: contactChar }, { data: messagesData }, { data: relData }] = await Promise.all([
          admin.from("characters").select("*").eq("id", threadFull.active_character_id).single(),
          admin.from("characters").select("*").eq("id", threadFull.contact_character_id).single(),
          admin.from("chat_messages").select("id,thread_id,sender_role,content,created_at,message_type,sticker_id").eq("thread_id", threadId).order("created_at", { ascending: true }),
          admin.from("character_relationships").select("*").eq("source_character_id", threadFull.contact_character_id).eq("target_character_id", threadFull.active_character_id).maybeSingle(),
        ]);

        const existingState = await getThreadRuntimeState(threadId);
        const seededState = existingState
          ? { affinity: existingState.affinity, annoyance: existingState.annoyance, trust: existingState.trust, familiarity: existingState.familiarity, mood: existingState.mood, blocked: existingState.blocked, messageCount: existingState.message_count, lastStickerAt: (existingState as any).last_sticker_at ?? null }
          : { ...seedRuntimeStateFromRelationship(relData), lastStickerAt: null };

        const stickerMessage = `[${activeChar.name} sent a sticker: ${sticker.label}]`;
        const nextState = deriveNextThreadRuntimeState(seededState, stickerMessage);

        const history = ((messagesData ?? []) as any[])
          .filter((m) => m.message_type !== "sticker" && m.content)
          .slice(-MAX_HISTORY)
          .map((m) => ({ role: m.sender_role === "active" ? "user" as const : "assistant" as const, content: m.content ?? "" }));

        const plannerChar = mapCharacterToProfile(contactChar);

        const [events, monsters] = await Promise.all([
          getRelevantEventsForCharacter({ characterKey: contactChar.key, limit: 5 }),
          searchRelevantMonsters({ message: stickerMessage, limit: 3 }),
        ]);

        const worldContext = [
          `This is a one-on-one text chat app. The user is portraying ${activeChar.name}.`,
          `You are ${contactChar.name}. Speak directly to ${activeChar.name} in chat.`,
          `Do not speak as an assistant. Do not use markdown. Do not narrate actions or stage directions.`,
          `${activeChar.name} just sent you a sticker labeled "${sticker.label}". React naturally and briefly to it.`,
          buildEventContextBlock(events),
          buildMonsterContextBlock(monsters, stickerMessage),
        ].filter(Boolean).join("");

        const { plan, prompt, memorySummary, modelSettings } = createReplyPlannerPrompt({
          message: stickerMessage,
          history,
          relationship: { affinity: nextState.affinity, annoyance: nextState.annoyance, trust: nextState.trust, familiarity: nextState.familiarity, mood: nextState.mood, blocked: nextState.blocked },
          character: plannerChar,
          worldContext,
          extraCharacterContext: {
            identityNotes: contactChar.identity_notes,
            conversationRules: contactChar.conversation_rules,
            relationshipBehavior: contactChar.relationship_behavior,
            loreContext: contactChar.lore_context,
            hardConstraints: contactChar.hard_constraints,
          },
        });

        let reply = "";
        const firstPass = await callDeepSeek({ apiKey, model: DEFAULT_MODEL, prompt, temperature: modelSettings.temperature, topP: modelSettings.topP, maxTokens: modelSettings.maxTokens });

        if (firstPass.response.ok) {
          reply = firstPass.reply;
          if (isWeakCharacterReply(reply)) {
            const repairPrompt = buildRepairPrompt({ originalPrompt: prompt, badReply: reply, plan, character: plannerChar });
            const secondPass = await callDeepSeek({ apiKey, model: DEFAULT_MODEL, prompt: repairPrompt, temperature: Math.min(modelSettings.temperature + 0.06, 0.92), topP: modelSettings.topP, maxTokens: modelSettings.maxTokens });
            if (secondPass.response.ok && !isWeakCharacterReply(secondPass.reply)) reply = secondPass.reply;
          }
        }

        const finalState = applyBlockingRule({ state: applyAssistantReplyEffects(nextState, reply), annoyanceThreshold: contactChar.annoyance_threshold ?? 85 });
        if (finalState.blocked) reply = contactChar.block_message || "This conversation is over.";

        const resolvedForm = resolveActiveForm(contactChar, finalState.mood);

        if (reply) {
          const { data: rm } = await admin.from("chat_messages").insert({
            thread_id: threadId, sender_role: "contact", content: reply, message_type: "text", sticker_id: null,
            resolved_name: resolvedForm.name !== contactChar.name ? resolvedForm.name : null,
            resolved_avatar: resolvedForm.avatar,
          }).select("id,thread_id,sender_role,content,created_at,message_type,sticker_id,resolved_name,resolved_avatar").single();
          replyMessage = rm;
        }

        const stickerChoice = reply && !finalState.blocked ? await chooseStickerForAiReply({
          userMessage: stickerMessage, replyText: reply, mood: finalState.mood,
          lastStickerAt: seededState.lastStickerAt ?? null,
          stickerEnabled: contactChar.sticker_enabled ?? false,
          stickerBaseChance: Number(contactChar.sticker_base_chance ?? 0.12),
          stickerMoodInfluence: Number(contactChar.sticker_mood_influence ?? 0.12),
        }) : null;

        if (stickerChoice) {
          const { data: sm } = await admin.from("chat_messages").insert({
            thread_id: threadId, sender_role: "contact", content: null, message_type: "sticker", sticker_id: stickerChoice.id,
            resolved_name: resolvedForm.name !== contactChar.name ? resolvedForm.name : null,
            resolved_avatar: resolvedForm.avatar,
          }).select("id,thread_id,sender_role,content,created_at,message_type,sticker_id,resolved_name,resolved_avatar,sticker:stickers(id,key,label,image_path)").single();
          stickerReplyMessage = sm ? { ...sm, sticker: Array.isArray((sm as any).sticker) ? (sm as any).sticker[0] ?? null : (sm as any).sticker } : null;
        }

        await upsertThreadRuntimeState({ threadId, affinity: finalState.affinity, annoyance: finalState.annoyance, trust: finalState.trust, familiarity: finalState.familiarity, mood: finalState.mood, blocked: finalState.blocked, messageCount: finalState.messageCount });
        await admin.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadId);
      } catch (aiError) {
        console.error("[chat-sticker-ai-error]", aiError);
      }
    }

    return NextResponse.json({
      ok: true,
      savedMessage: normalizedSavedMessage,
      replyMessage,
      stickerReplyMessage,
    });
  } catch (error) {
    console.error("[chat-sticker-error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error." },
      { status: 500 }
    );
  }
}