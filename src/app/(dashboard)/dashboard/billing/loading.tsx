export default function BillingLoading() {
  return (
    <main
      className="min-h-[100dvh] bg-[#07101f] p-4 text-foreground lg:p-9"
      data-testid="loading-state"
    >
      <div className="mx-auto grid max-w-[1536px] gap-5">
        <div className="grid gap-3">
          <div className="h-9 w-40 animate-pulse rounded bg-white/10" />
          <div className="h-5 w-full max-w-xl animate-pulse rounded bg-white/10" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div
              className="h-20 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]"
              key={index}
            />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
          <div className="bussin-panel h-96 animate-pulse rounded-lg" />
          <div className="bussin-panel h-96 animate-pulse rounded-lg" />
        </div>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div className="bussin-panel h-80 animate-pulse rounded-lg" />
          <div className="bussin-panel h-80 animate-pulse rounded-lg" />
        </div>
      </div>
    </main>
  );
}
