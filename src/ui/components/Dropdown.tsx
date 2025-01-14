import { useEffect, useState } from "react";
import { cn } from "../lib/utils";
import Checkbox from "./Checkbox";
import { ChevronDownIcon } from "lucide-react";

const Dropdown = ({
  label = "",
  type = "single",
  size = "md",
  items = [],
  value,
  onColumnChange,
  showIcon = true,
}: DropdownProps) => {
  const [open, setOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<
    DropdownItem | DropdownItem[] | null
  >(value ?? null);

  const switchDropdown = () => {
    setOpen(!open);
  };

  useEffect(() => {
    if (onColumnChange) {
      onColumnChange(selectedOptions);
    }
  }, [selectedOptions]);

  useEffect(() => {
    if (!onColumnChange) {
      if (!selectedOptions) {
        selectOption(value as DropdownItem, false);
      } else {
        const newOption = items.find(
          ({ id }) => id === (selectedOptions as DropdownItem).id
        );
        selectOption(newOption as DropdownItem, false);
      }
    }
  }, [value, onColumnChange]);

  const selectOption = (value: DropdownItem, withClose: boolean = true) => {
    if (type !== "single") {
      const l = selectedOptions ?? [];
      const exist = (l as any).some(({ id }: any) => id === value.id);
      let result;
      if (exist) {
        result = (l as any).filter(({ id }: any) => id !== value.id);
      } else {
        result = [...(l as any), value];
      }
      if (!result.length) {
        result = null;
      }
      setSelectedOptions(result);
    } else {
      setSelectedOptions(value);
      if (withClose) switchDropdown();
    }
  };

  const isChecked = (value: string): boolean => {
    return (selectedOptions as DropdownItem[])?.some(({ id }) => id === value);
  };

  const baseStyles =
    "font-semibold group rounded-md relative z-0 cursor-pointer transition-all duration-200 text-nowrap";

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

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-3 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const dropdownClassNames = `${baseStyles} ${textVariants.primary} ${
    sizes[size]
  } ${bgVariants.primary} ${
    open
      ? "rounded-b-none duration-100 border-b-0"
      : "hover:bg-[#262c34] duration-700"
  }`;

  return (
    <button
      className={cn(
        dropdownClassNames,
        "relative z-50 py-[5px] px-4 h-full flex items-center gap-1.5 transition-all"
      )}
      onClick={switchDropdown}
    >
      <span
        className={cn(
          open
            ? "max-h-26 duration-500 opacity-100"
            : "max-h-0 pointer-events-none duration-300 border-transparent opacity-0",
          "absolute bottom-0 left-0 bg-[#21262d] border-b border-l border-r no-scrollbar border-[#30363d] border-t-0 overflow-y-auto overflow-x-hidden rounded-2xl transition-[max-height_opacity] rounded-t-none w-full translate-y-full flex flex-col"
        )}
      >
        {items.map((option) => {
          return (
            <span
              key={option.id}
              className="py-2 px-3 hover:bg-[#2b2b2b] last-of-type:pb-3"
              onClick={(e) => {
                e.stopPropagation();
                selectOption(option);
              }}
            >
              {type === "multiple" && (
                <Checkbox
                  className="!w-5 !h-5"
                  isChecked={isChecked(option.value)}
                />
              )}
              {option.label}
            </span>
          );
        })}
      </span>
      {selectedOptions && type === "multiple"
        ? `Showing ${(selectedOptions as DropdownItem[])?.length} columns`
        : selectedOptions && type === "single"
        ? `${(selectedOptions as DropdownItem).label}`
        : label}
      {showIcon && (
        <ChevronDownIcon
          width={20}
          className={cn(
            open ? "rotate-180" : "rotate-0",
            "pt-[2px] transition-all duration-300 text-blue-400"
          )}
        />
      )}
    </button>
  );
};

export default Dropdown;

export interface DropdownItem {
  value: string;
  label: string;
  id: string;
}

export interface DropdownProps {
  label?: string;
  items?: DropdownItem[];
  type?: DropdownType;
  value?: DropdownItem[] | DropdownItem | null;
  onColumnChange?: (options: DropdownItem | DropdownItem[] | null) => void;
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

type DropdownType = "single" | "multiple";
