import { redirect } from "next/navigation";
import { isMockMode, mockUser } from "@/lib/app-config";
import { createClient } from "@/lib/supabase/server";
import { getFeedData } from "@/modules/feed/feed.queries";
import { SingleWindow } from "@/modules/feed/single-window";
import { AccountMenuExtras } from "@/modules/feed/account-menu";

export default async function DashboardPage() {
  const user = isMockMode
    ? { id: mockUser.id }
    : (await (await createClient()).auth.getUser()).data.user;

  if (!user) {
    redirect("/login");
  }

  const feed = await getFeedData(user.id);

  if (!feed) {
    redirect("/onboarding");
  }

  return (
    <SingleWindow
      accountMenuExtras={<AccountMenuExtras />}
      initialFeed={feed}
    />
  );
}
