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
    "font-semibold rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center gap-2 text-nowrap";

  const variants = {
    primary:
      "bg-primary text-secondary hover:bg-primary/50 focus:ring-primary",
    secondary:
      "bg-secondary text-primary hover:bg-secondary/80 focus:ring-secondary",
    outline:
      "border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:ring-primary",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-3 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const combinedClassName = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

  return (
    <button className={combinedClassName} {...props}>
      {children}
    </button>
  );
}
