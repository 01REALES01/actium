import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl border border-[--border-default] bg-[--bg-secondary] px-4 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-muted] transition-all duration-200 focus-visible:border-actium-orange focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-actium-orange/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
