import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold outline-none transition-all duration-200 ease-out active:translate-y-px active:scale-[0.99] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/35 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border border-violet-300/25 bg-gradient-to-b from-violet-500 to-violet-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_12px_28px_rgba(95,45,190,0.28)] hover:from-violet-400 hover:to-violet-600",
        destructive:
          "border border-red-300/20 bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-violet-300/20 bg-slate-950/30 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] hover:border-violet-300/40 hover:bg-violet-500/10",
        secondary:
          "border border-slate-300/10 bg-secondary/80 text-secondary-foreground hover:bg-secondary",
        ghost:
          "text-slate-300 hover:bg-violet-500/10 hover:text-slate-50 data-[active=true]:bg-violet-500/15 data-[active=true]:text-white",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      {...props}
    />
  );
}

export { Button, buttonVariants };
