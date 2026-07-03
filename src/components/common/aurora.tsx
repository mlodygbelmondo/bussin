import { cn } from "@/lib/utils";

export function Aurora({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden [mask-image:radial-gradient(ellipse_70%_60%_at_50%_35%,black,transparent)]",
        className,
      )}
    >
      <div className="aurora-blob absolute top-[-10%] left-[15%] h-[40rem] w-[40rem] rounded-full bg-aurora-1 opacity-45 blur-[100px] [animation-duration:24s]" />
      <div className="aurora-blob absolute top-[15%] right-[10%] h-[36rem] w-[36rem] rounded-full bg-aurora-2 opacity-35 blur-[110px] [animation-duration:30s]" />
      <div className="aurora-blob absolute bottom-[-30%] left-1/2 h-[44rem] w-[44rem] -translate-x-1/2 rounded-full bg-aurora-3 opacity-30 blur-[120px] [animation-duration:36s]" />
    </div>
  );
}
