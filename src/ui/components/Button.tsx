import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "font-semibold group rounded-md relative z-0 cursor-pointer transition-all duration-200 text-nowrap";

  const bgVariants = {
    primary: "bg-[var(--foreground-secondary)] hover:bg-primary/50",
    secondary:
      "bg-[var(--secondary)] hover:bg-secondary/80",
    outline:
      "border border-input bg-background hover:bg-accent",
  };

  const textVariants = {
    primary: "text-[var(--text-button)]",
    secondary: "text[var(--primary)]",
    outline: "hover:text-accent-foreground",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-3 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const btnClassNames = `${baseStyles} ${className} ${textVariants[variant]} ${sizes[size]}`;
  const bgClassNames = `rounded absolute duration-200 group-hover:scale-[1.04] inset-0 z-0 ${bgVariants[variant]}`;

  return (
    <button className={btnClassNames} {...props}>
      <span className={bgClassNames}></span>
      <div className="z-10 relative flex items-center gap-1.5">{children}</div>
    </button>
  );
}
