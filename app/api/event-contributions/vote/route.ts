import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { castEventSubmissionVote } from "@/lib/event-submissions";

const VOTER_COOKIE = "wavesline_event_voter_key";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const submissionId = String(body.submissionId ?? "").trim();
    const voteType = String(body.voteType ?? "").trim() as
      | "upvote"
      | "downvote";

    if (!submissionId || !["upvote", "downvote"].includes(voteType)) {
      return NextResponse.json(
        { error: "Invalid vote request." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    let voterKey = cookieStore.get(VOTER_COOKIE)?.value;

    if (!voterKey) {
      voterKey = crypto.randomUUID();
    }

    await castEventSubmissionVote({
      submissionId,
      voterKey,
      voteType,
    });

    const response = NextResponse.json({ ok: true });

    response.cookies.set(VOTER_COOKIE, voterKey, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown server error.",
      },
      { status: 500 }
    );
  }
}