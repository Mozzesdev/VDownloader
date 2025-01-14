import React, { useState, ReactNode } from "react";
import { cn } from "../lib/utils";

interface TooltipProps {
  text: string;
  children: ReactNode;
  className?: string;
  position?: "top" | "right" | "bottom" | "left";
  variant?: "primary" | "secondary" | "outline";
}

export const Tooltip: React.FC<TooltipProps> = ({
  text,
  children,
  position = "top",
  className = "",
  variant = "primary",
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    right: "top-1/2 left-full -translate-y-1/2 ml-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "top-1/2 right-full -translate-y-1/2 mr-2",
  };

  const bgVariants = {
    primary: "bg-[var(--foreground-secondary)] hover:bg-primary/50",
    secondary: "bg-[var(--secondary)] hover:bg-secondary/80",
    outline: "border border-input bg-background hover:bg-accent",
  };

  const textVariants = {
    primary: "text-[var(--text-button)]",
    secondary: "text[var(--primary)]",
    outline: "hover:text-accent-foreground",
  };

  const bgClassNames = cn(
    positionClasses[position],
    bgVariants[variant],
    "absolute z-10 px-2 py-1 rounded-sm shadow-sm transition-opacity duration-300",
    className
  );

  const textClassNames = cn("text-[12px] font-medium block text-nowrap", textVariants[variant]);

  const arrowPostionsClasses = {
    top: "bottom-[-4px] left-1/2 -translate-x-1/2",
    right: "left-[-4px] top-1/2 -translate-y-1/2",
    bottom: "top-[-4px] left-1/2 -translate-x-1/2",
    left: "right-[-4px] top-1/2 -translate-y-1/2",
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={bgClassNames}>
          <span className={textClassNames}>{text}</span>
          <div
            className={cn(
              "absolute w-2 h-2 rotate-45",
              arrowPostionsClasses[position] || "",
              bgVariants[variant] || ""
            )}
          ></div>
        </div>
      )}
    </div>
  );
};
