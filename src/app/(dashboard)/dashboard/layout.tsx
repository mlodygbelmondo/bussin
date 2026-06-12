import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {children}
    </div>
  );
}
