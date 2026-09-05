import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionId = (body.session_id || "anon").toString();
    const token = crypto.randomBytes(6).toString("hex");
    const roomName = `nhaa-consultation-${sessionId.slice(0, 8)}-${token}`;
    const roomUrl = `https://meet.jit.si/${roomName}`;

    return NextResponse.json({
      escalation_id: crypto.randomUUID(),
      room_url: roomUrl,
      room_id: roomName,
      message: "Human counselor consultation room created. Zero AI recording or eavesdropping.",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not initialize consultation room" },
      { status: 500 }
    );
  }
}
