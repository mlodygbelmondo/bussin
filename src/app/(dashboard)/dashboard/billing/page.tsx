import { redirect } from "next/navigation";
import { isMockMode, mockUser } from "@/lib/app-config";
import { createClient } from "@/lib/supabase/server";
import { getBillingPageData } from "@/modules/billing/billing-page.queries";
import { BillingSettingsScreen } from "@/modules/billing/billing-settings-screen";

export default async function BillingPage() {
  const user = isMockMode
    ? { id: mockUser.id }
    : (await (await createClient()).auth.getUser()).data.user;

  if (!user) {
    redirect("/login");
  }

  const billing = await getBillingPageData(user.id);

  if (!billing) {
    redirect("/onboarding");
  }

  return <BillingSettingsScreen activeRoute="billing" data={billing} />;
}
