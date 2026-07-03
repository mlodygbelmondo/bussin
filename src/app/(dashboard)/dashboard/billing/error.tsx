"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function BillingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      className="grid min-h-[100dvh] place-items-center bg-background p-7 text-foreground"
      data-testid="error-state"
    >
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-xl">Something went wrong.</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Try again.
          </p>
          <Button className="mt-5" onClick={reset} type="button">
            Try again
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
