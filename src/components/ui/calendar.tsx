"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

/**
 * Token-styled calendar on react-day-picker. Used by the schedule dialog;
 * plain token classes (no variants), per the design-doc authoring convention.
 */
export function Calendar({
  className,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      className={cn("p-2", className)}
      classNames={{
        button_next:
          "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        button_previous:
          "inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        caption_label: "text-sm font-medium",
        day: "p-0 text-center",
        day_button:
          "size-8 rounded-md text-sm transition-colors hover:bg-accent aria-selected:bg-primary aria-selected:text-primary-foreground aria-selected:hover:bg-primary",
        disabled: "opacity-40 [&>button]:pointer-events-none",
        hidden: "invisible",
        month_caption: "flex h-8 items-center justify-center",
        month_grid: "mt-1 border-separate border-spacing-0.5",
        months: "relative",
        nav: "absolute inset-x-0 top-0 z-10 flex items-center justify-between",
        outside: "text-muted-foreground/50",
        today: "[&>button]:font-semibold [&>button]:text-primary",
        weekday: "size-8 text-xs font-normal text-muted-foreground",
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  );
}
