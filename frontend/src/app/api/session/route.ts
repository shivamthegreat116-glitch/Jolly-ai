import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.consent_text) {
      return NextResponse.json(
        { error: "Text-chat consent is required to start." },
        { status: 400 }
      );
    }

    const sessionId = crypto.randomUUID();
    const anonymousId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    return NextResponse.json({
      session_id: sessionId,
      anonymous_id: anonymousId,
      expires_at: expiresAt,
      disclaimer: "This AI is a support and triage tool, not a medical, legal, or emergency service.",
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid session payload" },
      { status: 400 }
    );
  }
}
