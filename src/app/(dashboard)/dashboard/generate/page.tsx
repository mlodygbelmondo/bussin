import { ChevronDown, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { DashboardTopBar } from "@/components/common/dashboard-top-bar";
import { isMockMode, mockUser } from "@/lib/app-config";
import { createClient } from "@/lib/supabase/server";
import { CreateGenerationForm } from "@/modules/generation/create-generation-form";
import { getGenerateScreenData } from "@/modules/generation/generation.queries";
import type { GenerationPrefill } from "@/modules/generation/create-generation-form";

type GeneratePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GeneratePage({
  searchParams,
}: GeneratePageProps) {
  const params = await searchParams;
  const user = isMockMode
    ? { id: mockUser.id }
    : (await (await createClient()).auth.getUser()).data.user;

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(generateNextPath(params))}`);
  }

  const data = await getGenerateScreenData(user.id);

  if (!data) {
    redirect("/onboarding");
  }

  const prefill = toPrefill(params);

  return (
    <main className="min-h-[100dvh] bg-[#07101f] text-foreground">
      <DashboardTopBar />
      <div className="mx-auto max-w-[1536px] px-4 py-6 lg:px-9">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              Create Generation
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Turn your idea into music. Fast, simple, and ready for YouTube.
            </p>
          </div>
          <div className="hidden h-10 items-center gap-2 rounded-full border border-violet-300/40 bg-violet-600/18 px-4 text-sm font-semibold text-violet-100 shadow-[0_0_24px_rgba(124,58,237,0.22)] md:flex">
            <Sparkles className="size-4" />
            Variation 2 of 7
            <ChevronDown className="size-4" />
          </div>
        </header>
        <CreateGenerationForm data={data} prefill={prefill} />
      </div>
    </main>
  );
}

function toPrefill(
  params?: Record<string, string | string[] | undefined>,
): GenerationPrefill {
  return {
    durationSeconds: toNumber(singleParam(params?.duration_seconds)),
    imageAssetId: singleParam(params?.image_asset_id),
    mood: singleParam(params?.mood),
    style: singleParam(params?.style),
  };
}

function generateNextPath(
  params?: Record<string, string | string[] | undefined>,
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, item));
    } else if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();

  return query ? `/dashboard/generate?${query}` : "/dashboard/generate";
}

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value?: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
