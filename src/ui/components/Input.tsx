import { forwardRef } from "react";
import { cn } from "../lib/utils";

const Input = forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full rounded-md placeholder:text-[var(--text-button)] text-[var(--text-button)] border bg-transparent px-3 py-1 text-base shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

export default Input;
