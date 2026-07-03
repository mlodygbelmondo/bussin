"use client";

import { Eye, EyeOff, LockKeyhole, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

export function PasswordField({ placeholder }: { placeholder: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const Icon = showPassword ? EyeOff : Eye;

  return (
    <label className="grid gap-1.5 text-sm font-medium">
      Password
      <span className="relative block">
        <span className="absolute top-1/2 left-4 z-10 -translate-y-1/2 text-muted-foreground">
          <LockKeyhole className="size-4" />
        </span>
        <Input
          className="h-11 rounded-lg pl-12 pr-11 text-[15px]"
          name="password"
          placeholder={placeholder}
          required
          type={showPassword ? "text" : "password"}
        />
        <button
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="absolute top-1/2 right-4 z-10 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setShowPassword((current) => !current)}
          type="button"
        >
          <Icon className="size-4" />
        </button>
      </span>
    </label>
  );
}

export function PendingPromptNotice() {
  const [hasPendingPrompt, setHasPendingPrompt] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const pendingPrompt = localStorage.getItem("bussin.pending-prompt");

      setHasPendingPrompt(Boolean(pendingPrompt?.trim()));
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  if (!hasPendingPrompt) {
    return null;
  }

  return (
    <p
      className="mb-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground"
      data-testid="pending-prompt-notice"
    >
      <Sparkles className="size-3.5 text-primary" />
      Your prompt is saved — finish signing up to generate it.
    </p>
  );
}
