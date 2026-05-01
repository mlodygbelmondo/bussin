import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Direct Suno generation is disabled. Create a generation request so the worker can persist tracks and polling jobs.",
    },
    { status: 410 },
  );
}
