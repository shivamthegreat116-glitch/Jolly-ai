import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    name: "Jolly AI",
    disclaimer: "Support and triage tool only — not a diagnosis or emergency service.",
  });
}
