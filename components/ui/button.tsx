import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,color,border-color,opacity,filter,transform] duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-red-600/20 dark:aria-invalid:ring-red-600/40 aria-invalid:border-red-600 pointer-coarse:active:scale-[0.99]",
  {
    variants: {
      variant: {
        // default buttons are CTAs — use terracotta accent for strong visibility
        default:
          "bg-accent text-on-accent pointer-fine:hover:brightness-95 pointer-coarse:active:brightness-95",
        destructive:
          "bg-red-500 text-white pointer-fine:hover:bg-red-600/90 pointer-coarse:active:bg-red-600/90 focus-visible:ring-red-600/20 dark:focus-visible:ring-red-600/40 dark:bg-red-600/60",
        outline:
          "border bg-background shadow-xs pointer-fine:hover:bg-accent pointer-fine:hover:text-accent-foreground pointer-coarse:active:bg-accent pointer-coarse:active:text-accent-foreground dark:bg-input/30 dark:border-input dark:pointer-fine:hover:bg-input/50 dark:pointer-coarse:active:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground pointer-fine:hover:brightness-95 pointer-coarse:active:brightness-95",
        ghost:
          "pointer-fine:hover:bg-accent pointer-fine:hover:text-accent-foreground pointer-coarse:active:bg-accent pointer-coarse:active:text-accent-foreground dark:pointer-fine:hover:bg-accent/50 dark:pointer-coarse:active:bg-accent/50",
        link: "text-primary underline-offset-4 pointer-fine:hover:underline pointer-coarse:active:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
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
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
