// app/api/chat/sticker/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStickerById } from "@/lib/chat/stickers";

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

    return NextResponse.json({
      ok: true,
      savedMessage: {
        ...savedMessage,
        sticker: Array.isArray((savedMessage as any).sticker)
          ? (savedMessage as any).sticker[0] ?? null
          : (savedMessage as any).sticker,
      },
    });
  } catch (error) {
    console.error("[chat-sticker-error]", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error." },
      { status: 500 }
    );
  }
}