import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { castSubmissionVote } from "@/lib/character-submissions";

const VOTER_COOKIE = "wavesline_voter_key";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const cookieStore = await cookies();
    let voterKey = cookieStore.get(VOTER_COOKIE)?.value;

    if (!voterKey) {
      voterKey = crypto.randomUUID();
    }

    await castSubmissionVote({
      submissionId: String(body.submissionId ?? "").trim(),
      voterKey,
      voteType: body.voteType === "downvote" ? "downvote" : "upvote",
    });

    const response = NextResponse.json({ ok: true });

    response.cookies.set(VOTER_COOKIE, voterKey, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to vote.",
      },
      { status: 400 }
    );
  }
}