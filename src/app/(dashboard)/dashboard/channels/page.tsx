import { redirect } from "next/navigation";
import { isMockMode, mockUser } from "@/lib/app-config";
import { createClient } from "@/lib/supabase/server";
import {
  ChannelLimitFooter,
  ChannelsGrid,
  ChannelsHero,
  ChannelsTopBar,
} from "@/modules/channels/channels-components";
import { ChannelsToolbar } from "@/modules/channels/channels-toolbar";
import { getChannelsScreenData } from "@/modules/channels/channels.queries";

type ChannelsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ChannelsPage({
  searchParams,
}: ChannelsPageProps) {
  const user = isMockMode
    ? { id: mockUser.id }
    : (await (await createClient()).auth.getUser()).data.user;

  if (!user) {
    redirect("/login");
  }

  const data = await getChannelsScreenData(user.id);

  if (!data) {
    redirect("/onboarding");
  }

  const params = await searchParams;
  const query = singleParam(params?.q)?.trim() ?? "";
  const status = singleParam(params?.status) ?? "all";
  const filteredChannels = data.channels.filter((channel) => {
    const matchesStatus = status === "all" || channel.status === status;
    const needle = query.toLowerCase();
    const matchesQuery =
      !needle ||
      channel.title.toLowerCase().includes(needle) ||
      channel.handle?.toLowerCase().includes(needle) ||
      channel.connectedAccount.toLowerCase().includes(needle);

    return matchesStatus && matchesQuery;
  });

  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] text-foreground"
      data-testid="screen-dashboard-channels"
    >
      <ChannelsTopBar />
      <div className="mx-auto max-w-[1536px] px-4 py-6 lg:px-9">
        <header className="mb-5">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Channels
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Manage your connected platforms and publishing destinations.
          </p>
        </header>

        <ChannelsHero data={data} />

        <section className="mt-7">
          <ChannelsToolbar data={data} query={query} status={status} />
          <ChannelsGrid
            channels={filteredChannels}
            planLimitReached={data.hasPlanLimitReached}
          />
        </section>

        <ChannelLimitFooter data={data} />
      </div>
    </main>
  );
}

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
