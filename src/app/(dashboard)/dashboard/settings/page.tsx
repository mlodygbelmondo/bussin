import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getBillingPageData } from "@/modules/billing/billing-page.queries";
import { BillingSettingsScreen } from "@/modules/billing/billing-settings-screen";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const billing = await getBillingPageData(user.id);

  if (!billing) {
    redirect("/onboarding");
  }

  return <BillingSettingsScreen activeRoute="settings" data={billing} />;
}
