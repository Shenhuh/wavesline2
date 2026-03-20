// app/api/auth/post-login/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const forcedNext = url.searchParams.get("next");

  if (forcedNext) {
    return NextResponse.json({ destination: forcedNext });
  }

  return NextResponse.json({ destination: "/select" });
}