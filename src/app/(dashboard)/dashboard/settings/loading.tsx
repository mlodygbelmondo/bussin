export default function SettingsLoading() {
  return (
    <main
      className="min-h-full bg-[#050b18] p-7 text-foreground"
      data-testid="loading-state"
    >
      <div className="mx-auto grid max-w-[1500px] gap-6">
        <div className="h-10 w-72 animate-pulse rounded bg-white/10" />
        <div className="h-10 w-full max-w-3xl animate-pulse rounded-lg bg-white/10" />
        <div className="grid gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              className="bussin-panel h-96 animate-pulse rounded-lg"
              key={index}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
