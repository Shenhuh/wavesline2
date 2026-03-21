// app/api/admin/upload-avatar/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function sanitizeFileNamePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const characterKey = String(formData.get("characterKey") ?? "character").trim();

    if (!file || file.size <= 0) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeKey = sanitizeFileNamePart(characterKey);
    const ext =
      file.name.split(".").pop()?.toLowerCase() ||
      file.type.split("/").pop() ||
      "png";

    const filePath = `avatars/${safeKey}-form-${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("character-assets")
      .upload(filePath, buffer, {
        contentType: file.type || "image/png",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data } = supabase.storage
      .from("character-assets")
      .getPublicUrl(filePath);

    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 }
    );
  }
}