import React, { forwardRef, useId } from "react";

interface SwitchProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  onToggle?: (isChecked: boolean) => void;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, onChange, onToggle, checked, ...props }, ref) => {
    const id = useId();

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(event);
      onToggle?.(event.target.checked);
    };

    return (
      <div className="flex items-center space-x-2">
        {label && (
          <label htmlFor={id} className="text-gray-300 text-sm cursor-pointer">
            {label}
          </label>
        )}
        <label
          htmlFor={id}
          className={`
            relative inline-flex items-center h-6 rounded-full w-11 
            transition-colors duration-300 ease-in-out 
            ${checked ? "bg-[var(--background)]" : "bg-[var(--foreground-secondary)]"}
            cursor-pointer
          `}
        >
          <input
            type="checkbox"
            id={id}
            ref={ref}
            checked={checked}
            onChange={handleChange}
            className="sr-only"
            {...props}
          />
          <span className="sr-only">{label || "Toggle dark mode"}</span>
          <span
            className={`
              inline-block w-4 h-4 transform rounded-full bg-white shadow-lg
              transition-transform duration-300 ease-in-out
              ${checked ? "translate-x-6" : "translate-x-1"}
            `}
          />
        </label>
      </div>
    );
  }
);

export default Switch;
