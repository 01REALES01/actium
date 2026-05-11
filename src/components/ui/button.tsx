import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-actium-orange/40 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-actium-orange text-white shadow-actium hover:bg-actium-orange-hover hover:shadow-actium-lg",
        destructive: "bg-danger text-white hover:bg-red-600",
        outline:
          "border border-actium-orange text-actium-orange hover:bg-actium-orange/10",
        secondary:
          "border border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary] hover:bg-[--bg-hover]",
        ghost: "text-[--text-secondary] hover:bg-[--bg-hover] hover:text-[--text-primary]",
        link: "text-actium-orange underline-offset-4 hover:text-actium-orange-hover hover:underline",
      },
      size: {
        default: "h-10 px-6 py-2.5",
        sm: "h-9 px-4",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
