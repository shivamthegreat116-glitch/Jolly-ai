import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "All session conversation logs and identifiers have been permanently purged.",
    deleted: true,
  });
}
