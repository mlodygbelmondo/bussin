import { cn } from "@/lib/utils";

/*
 * Sparse, hand-placed sparks for the dashboard hero — part of the single
 * ambient signature next to <Aurora />. Positions are fixed (not random) so
 * server and client render identically. CSS drives the twinkle; reduced
 * motion turns it off in globals.css.
 */
const SPARKS: Array<{
  delay: number;
  duration: number;
  ember?: boolean;
  left: string;
  size: number;
  top: string;
}> = [
  { delay: 0, duration: 6.5, left: "6%", size: 2, top: "24%" },
  { delay: 2.1, duration: 7.5, left: "12%", size: 3, top: "62%", ember: true },
  { delay: 4.4, duration: 6, left: "17%", size: 2, top: "12%" },
  { delay: 1.2, duration: 8, left: "23%", size: 2, top: "44%" },
  { delay: 3.6, duration: 7, left: "31%", size: 3, top: "18%" },
  { delay: 5.2, duration: 6.5, left: "38%", size: 2, top: "70%" },
  { delay: 0.8, duration: 7.5, left: "46%", size: 2, top: "8%", ember: true },
  { delay: 2.9, duration: 6, left: "54%", size: 2, top: "58%" },
  { delay: 4.1, duration: 8, left: "61%", size: 3, top: "26%" },
  { delay: 1.7, duration: 6.5, left: "68%", size: 2, top: "74%" },
  { delay: 3.3, duration: 7, left: "74%", size: 2, top: "14%" },
  { delay: 5.6, duration: 7.5, left: "81%", size: 3, top: "48%", ember: true },
  { delay: 0.4, duration: 6, left: "88%", size: 2, top: "30%" },
  { delay: 2.5, duration: 8, left: "94%", size: 2, top: "64%" },
];

export function Starfield({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      {SPARKS.map((spark, index) => (
        <span
          className={cn("star", spark.ember && "star-ember")}
          key={index}
          style={{
            animationDelay: `${spark.delay}s`,
            animationDuration: `${spark.duration}s`,
            height: spark.size,
            left: spark.left,
            top: spark.top,
            width: spark.size,
          }}
        />
      ))}
    </div>
  );
}
