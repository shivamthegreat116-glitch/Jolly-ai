import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    return NextResponse.json({
      ok: true,
      message: body.share_with_caseworker
        ? "Your summary has been queued for a designated caseworker upon explicit consent."
        : "Summary saved securely in your browser session.",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process summary" },
      { status: 400 }
    );
  }
}
