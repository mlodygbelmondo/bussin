import { cn } from "@/lib/utils";

/**
 * Pulse — the Bussin brand mark. Four waveform bars on the ember gradient.
 * The only place besides <Aurora /> where a gradient is allowed.
 */
export function PulseMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("size-6", className)}
      fill="none"
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="pulse-ember"
          x1="4"
          x2="44"
          y1="44"
          y2="4"
        >
          <stop offset="0" stopColor="#a61b86" />
          <stop offset="0.55" stopColor="#f04796" />
          <stop offset="1" stopColor="#fe838f" />
        </linearGradient>
      </defs>
      <rect
        fill="url(#pulse-ember)"
        height="12"
        rx="3.5"
        width="7"
        x="6"
        y="18"
      />
      <rect
        fill="url(#pulse-ember)"
        height="32"
        rx="3.5"
        width="7"
        x="16"
        y="8"
      />
      <rect
        fill="url(#pulse-ember)"
        height="20"
        rx="3.5"
        width="7"
        x="26"
        y="14"
      />
      <rect
        fill="url(#pulse-ember)"
        height="6"
        rx="3"
        width="7"
        x="36"
        y="21"
      />
    </svg>
  );
}
