import React from "react";
import { cn } from "../lib/utils";

const Checkbox: React.FC<CheckboxProps> = ({
  className = "",
  isChecked,
  onChange,
}: CheckboxProps) => {
  return (
    <div className="inline-flex items-center gap-2">
      <label className="relative flex items-center cursor-pointer">
        <input
          type="checkbox"
          className={cn(
            className,
            "before:content[''] border-neutral-500 peer relative h-6 w-6 cursor-pointer appearance-none rounded-[4px] border border-blue-gray-200 transition-all before:absolute before:top-2/4 before:left-2/4 before:block before:h-12 before:w-12 before:-translate-y-2/4 before:-translate-x-2/4 before:rounded-full before:bg-blue-gray-500 before:opacity-0 before:transition-opacity checked:border-gray-900 checked:bg-green-500 checked:before:bg-gray-900"
          )}
          id="checkbox"
          onChange={onChange}
          checked={isChecked}
          readOnly
        />
        <span className="absolute text-white transition-opacity opacity-0 pointer-events-none top-2/4 left-2/4 -translate-y-2/4 -translate-x-2/4 peer-checked:opacity-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3.5 w-3.5"
            viewBox="0 0 20 20"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            ></path>
          </svg>
        </span>
      </label>
    </div>
  );
};

export default Checkbox;

export interface CheckboxProps {
  isChecked: boolean;
  className?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
