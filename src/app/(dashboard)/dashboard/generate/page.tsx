import { Bell, ChevronDown, Megaphone, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  const user = isMockMode
    ? { id: mockUser.id }
    : (await (await createClient()).auth.getUser()).data.user;

  if (!user) {
    redirect("/login");
  }

  const data = await getGenerateScreenData(user.id);

  if (!data) {
    redirect("/onboarding");
  }

  const params = await searchParams;
  const prefill = toPrefill(params);

  return (
    <main className="min-h-[100dvh] bg-[#07101f] text-foreground">
      <TopBar />
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

function TopBar() {
  return (
    <header className="flex h-[73px] items-center justify-end gap-4 border-b border-white/10 bg-[#0b1022]/80 px-4 backdrop-blur lg:px-9">
      <Link
        className="hidden h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:flex"
        href="/dashboard/channels"
      >
        <Megaphone className="size-4 text-slate-300" />
        What&apos;s new
        <span className="size-1.5 rounded-full bg-violet-400" />
      </Link>
      <label className="hidden h-9 w-full max-w-[335px] items-center gap-3 rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm text-slate-500 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:flex">
        <Search className="size-4 text-slate-500" />
        <span className="flex-1">Search anything...</span>
        <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-400">
          ⌘ /
        </kbd>
      </label>
      <Button
        aria-label="Notifications"
        className="text-slate-300"
        size="icon"
        type="button"
        variant="ghost"
      >
        <Bell className="size-5" />
      </Button>
      <button className="flex items-center gap-2 text-sm text-slate-300">
        <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-violet-700 font-semibold text-white">
          AM
        </span>
        <ChevronDown className="size-4" />
      </button>
    </header>
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

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toNumber(value?: string) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}
