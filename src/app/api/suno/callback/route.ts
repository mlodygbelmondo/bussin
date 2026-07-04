import { NextResponse } from "next/server";

// The Suno API requires a callBackUrl on every generation request, but the
// worker polls record-info for results — this endpoint only acknowledges the
// callback so Suno does not mark the task with CALLBACK_EXCEPTION.
export async function POST() {
  return NextResponse.json({ ok: true });
}
