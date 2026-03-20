// app/chat/start/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserActiveCharacterId } from "@/lib/chat/app-chat";

type ChatThreadInsertRow = {
  id: string;
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const contactCharacterId = String(
      formData.get("contactCharacterId") ?? ""
    ).trim();

    if (!contactCharacterId) {
      return NextResponse.redirect(new URL("/chat", request.url));
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const activeCharacterId = await getUserActiveCharacterId(user.id);

    if (!activeCharacterId) {
      return NextResponse.redirect(new URL("/select", request.url));
    }

    if (activeCharacterId === contactCharacterId) {
      return NextResponse.redirect(new URL("/chat", request.url));
    }

    const admin = createAdminClient();

    const { data: existingThread, error: existingError } = await admin
      .from("chat_threads")
      .select("id")
      .eq("user_id", user.id)
      .eq("active_character_id", activeCharacterId)
      .eq("contact_character_id", contactCharacterId)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    let threadId = existingThread?.id as string | undefined;

    if (!threadId) {
      const { data: insertedThread, error: insertError } = await admin
        .from("chat_threads")
        .insert({
          user_id: user.id,
          active_character_id: activeCharacterId,
          contact_character_id: contactCharacterId,
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError || !insertedThread) {
        throw new Error(insertError?.message || "Failed to create thread.");
      }

      threadId = (insertedThread as ChatThreadInsertRow).id;
    }

    return NextResponse.redirect(
      new URL(`/chat?thread=${threadId}`, request.url)
    );
  } catch (error) {
    console.error("[chat-start-route-error]", error);
    return NextResponse.redirect(new URL("/chat", request.url));
  }
}