import type { ReactNode } from "react";
import { AudioLines } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type RouteStubProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function RouteStub({ title, description, children }: RouteStubProps) {
  return (
    <main className="bussin-grid min-h-full bg-background p-4 text-foreground sm:p-6">
      <Card className="mx-auto max-w-4xl overflow-hidden">
        <CardHeader>
          <Badge className="mb-2" variant="secondary">
            Bussin cockpit
          </Badge>
          <div className="grid gap-6 md:grid-cols-[1fr_260px] md:items-end">
            <div>
              <CardTitle className="text-3xl tracking-tight text-white">
                {title}
              </CardTitle>
              <CardDescription className="mt-3 max-w-2xl">
                {description}
              </CardDescription>
            </div>
            <div className="relative h-28 overflow-hidden rounded-lg border border-violet-200/10 bg-slate-950/50">
              <div className="bussin-waveform absolute inset-x-4 top-6 h-16 opacity-80" />
              <div className="absolute right-4 bottom-4 flex items-center gap-2 text-xs text-muted-foreground">
                <AudioLines className="size-4 text-violet-200" />
                Awaiting module data
              </div>
            </div>
          </div>
        </CardHeader>
        {children ? <CardContent>{children}</CardContent> : null}
      </Card>
    </main>
  );
}
