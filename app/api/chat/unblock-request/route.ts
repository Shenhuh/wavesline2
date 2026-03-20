// app/api/chat/unblock-request/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getThreadRuntimeState,
  upsertThreadRuntimeState,
} from "@/lib/chat/app-chat";

type ThreadRow = {
  id: string;
  user_id: string;
  active_character_id: string;
  contact_character_id: string;
};

type CharacterRow = {
  id: string;
  name: string;
  key: string;
  block_message: string | null;
};

function moodUnblockChance(mood: string | null | undefined) {
  switch ((mood ?? "").toLowerCase()) {
    case "angry":
      return 0.06;
    case "irritated":
      return 0.12;
    case "cold":
      return 0.18;
    case "neutral":
      return 0.28;
    case "warm":
      return 0.42;
    default:
      return 0.18;
  }
}

function rejectionMessage(characterName: string, mood: string | null | undefined) {
  switch ((mood ?? "").toLowerCase()) {
    case "angry":
      return `${characterName} ignores the request.`;
    case "irritated":
      return `${characterName} refuses to reopen the conversation.`;
    case "cold":
      return `${characterName} remains unconvinced and keeps the block in place.`;
    case "neutral":
      return `${characterName} does not lift the block.`;
    case "warm":
      return `${characterName} hesitates, but does not lift the block yet.`;
    default:
      return `${characterName} does not lift the block.`;
  }
}

function successMessage(characterName: string, mood: string | null | undefined) {
  switch ((mood ?? "").toLowerCase()) {
    case "warm":
      return `${characterName} gives you another chance.`;
    case "neutral":
      return `${characterName} lifts the block—for now.`;
    case "cold":
      return `${characterName} reluctantly allows the conversation to continue.`;
    case "irritated":
      return `${characterName} lifts the block, but patience is still thin.`;
    case "angry":
      return `${characterName} unexpectedly allows one more chance.`;
    default:
      return `${characterName} lifts the block—for now.`;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const threadId = String(body.threadId ?? "").trim();

    if (!threadId) {
      return NextResponse.json(
        { error: "Missing threadId." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    const { data: thread, error: threadError } = await admin
      .from("chat_threads")
      .select("*")
      .eq("id", threadId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (threadError) {
      return NextResponse.json(
        { error: threadError.message },
        { status: 500 }
      );
    }

    if (!thread) {
      return NextResponse.json(
        { error: "Thread not found." },
        { status: 404 }
      );
    }

    const threadRow = thread as ThreadRow;

    const [runtimeState, characterResult] = await Promise.all([
      getThreadRuntimeState(threadId),
      admin
        .from("characters")
        .select("id, name, key, block_message")
        .eq("id", threadRow.contact_character_id)
        .single(),
    ]);

    if (characterResult.error || !characterResult.data) {
      return NextResponse.json(
        { error: characterResult.error?.message || "Character not found." },
        { status: 500 }
      );
    }

    const character = characterResult.data as CharacterRow;

    if (!runtimeState?.blocked) {
      return NextResponse.json({
        ok: true,
        blocked: false,
        granted: true,
        message: `${character.name} has not blocked you.`,
      });
    }

    const chance = moodUnblockChance(runtimeState.mood);
    const granted = Math.random() < chance;

    if (granted) {
      const reducedAnnoyance = Math.max(0, runtimeState.annoyance - 20);
      const nextMood =
        reducedAnnoyance >= 70
          ? "angry"
          : reducedAnnoyance >= 40
          ? "irritated"
          : runtimeState.trust <= 15
          ? "cold"
          : "neutral";

      await upsertThreadRuntimeState({
        threadId,
        affinity: runtimeState.affinity,
        annoyance: reducedAnnoyance,
        trust: Math.min(100, runtimeState.trust + 2),
        familiarity: runtimeState.familiarity,
        mood: nextMood,
        blocked: false,
        messageCount: runtimeState.message_count,
      });

      return NextResponse.json({
        ok: true,
        blocked: false,
        granted: true,
        message: successMessage(character.name, runtimeState.mood),
        chance,
      });
    }

    const increasedAnnoyance = Math.min(100, runtimeState.annoyance + 2);
    const nextMood =
      increasedAnnoyance >= 70
        ? "angry"
        : increasedAnnoyance >= 40
        ? "irritated"
        : runtimeState.trust <= 15
        ? "cold"
        : runtimeState.mood ?? "cold";

    await upsertThreadRuntimeState({
      threadId,
      affinity: runtimeState.affinity,
      annoyance: increasedAnnoyance,
      trust: runtimeState.trust,
      familiarity: runtimeState.familiarity,
      mood: nextMood,
      blocked: true,
      messageCount: runtimeState.message_count,
    });

    return NextResponse.json({
      ok: true,
      blocked: true,
      granted: false,
      message: rejectionMessage(character.name, runtimeState.mood),
      chance,
    });
  } catch (error) {
    console.error("[unblock-request-error]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}