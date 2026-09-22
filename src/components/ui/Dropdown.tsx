"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/cn";

interface DropdownOption {
  id: string;
  label: string;
}

interface DropdownProps {
  trigger: React.ReactNode;
  options: DropdownOption[];
  onSelect: (id: string) => void;
  align?: "left" | "right";
}

export function Dropdown({ trigger, options, onSelect, align = "left" }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="inline-flex">
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={cn(
            "absolute top-full z-20 mt-1 min-w-[10rem] rounded-md border border-line bg-paper py-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {options.map((opt) => (
            <button
              key={opt.id}
              role="menuitem"
              onClick={() => {
                onSelect(opt.id);
                setOpen(false);
              }}
              className="block w-full px-3 py-2 text-left text-sm text-ink/80 hover:bg-ink/5"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
