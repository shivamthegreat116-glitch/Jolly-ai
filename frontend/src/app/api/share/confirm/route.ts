import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      ok: true,
      message: body.confirm
        ? `Confirmed: Summary queued for ${body.destination || "designated caseworker"}.`
        : "Action cancelled. No summary will be shared.",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to confirm share action" },
      { status: 400 }
    );
  }
}
