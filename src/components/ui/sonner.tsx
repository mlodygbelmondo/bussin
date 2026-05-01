"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

function Toaster({ theme = "dark", ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      theme={theme}
      {...props}
    />
  );
}

export { Toaster };
