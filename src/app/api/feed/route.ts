import { NextResponse } from "next/server";
import { isMockMode, mockUser } from "@/lib/app-config";
import { createWorkspaceClient } from "@/lib/supabase";
import { getFeedData } from "@/modules/feed/feed.queries";

export async function GET() {
  let userId: string | null = null;

  if (isMockMode) {
    userId = mockUser.id;
  } else {
    const supabase = await createWorkspaceClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userId = user?.id ?? null;
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const feed = await getFeedData(userId);

    if (!feed) {
      return NextResponse.json({ error: "No workspace" }, { status: 404 });
    }

    return NextResponse.json(feed);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load the feed.",
      },
      { status: 500 },
    );
  }
}
