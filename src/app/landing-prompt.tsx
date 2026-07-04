"use client";

import { ArrowRight, Music2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function LandingPrompt({ prompts }: { prompts: string[] }) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");

  function submitPrompt() {
    const prompt = value.trim();

    if (prompt) {
      localStorage.setItem("bussin.pending-prompt", prompt);
    }

    router.push("/signup");
  }

  return (
    <>
      <div className="prompt-card mt-10 rounded-xl border border-line bg-popover/90 p-3 text-left shadow-[var(--shadow-elevated)] backdrop-blur-sm transition-shadow focus-within:border-primary/60">
        <Textarea
          className="resize-none border-0 bg-transparent text-base shadow-none focus-visible:border-transparent focus-visible:ring-0"
          data-testid="landing-prompt-input"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submitPrompt();
            }
          }}
          placeholder="Describe the track you want — style, mood, instruments…"
          ref={textareaRef}
          rows={3}
          value={value}
        />
        <div className="flex items-center justify-between pt-2">
          <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <Music2 className="size-3" />
            Instrumental tracks • ~2 min per generation
          </p>
          <Button
            data-testid="landing-cta"
            onClick={submitPrompt}
            type="button"
          >
            Start creating
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {prompts.map((prompt) => (
          <button
            className="rounded-full border border-line bg-panel/50 px-3.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
            key={prompt}
            onClick={() => {
              setValue(prompt);
              textareaRef.current?.focus();
            }}
            type="button"
          >
            {prompt}
          </button>
        ))}
      </div>
    </>
  );
}
