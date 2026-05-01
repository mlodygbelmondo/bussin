export default function GenerateLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] p-4 text-foreground lg:p-9"
      data-testid="loading-state"
    >
      <div className="mx-auto max-w-[1536px] animate-pulse space-y-4">
        <div className="h-10 w-72 rounded-lg bg-white/10" />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="h-[760px] rounded-lg border border-white/10 bg-white/[0.04]" />
          <div className="h-[620px] rounded-lg border border-white/10 bg-white/[0.04]" />
        </div>
      </div>
    </main>
  );
}
