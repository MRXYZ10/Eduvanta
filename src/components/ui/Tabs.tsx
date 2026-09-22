"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  value?: string; // controlled Ã¢â‚¬â€ parent owns the active tab
  defaultValue?: string; // uncontrolled Ã¢â‚¬â€ Tabs owns its own state
  onChange?: (id: string) => void;
  children: (activeTab: string) => React.ReactNode;
}

export function Tabs({ tabs, value, defaultValue, onChange, children }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? tabs[0]?.id);

  if (tabs.length === 0) {
    return null;
  }

  const firstTab = tabs[0];
  if (!firstTab) {
    return null;
  }

  const active = value ?? internalValue ?? firstTab.id;

  function select(id: string) {
    if (value === undefined) setInternalValue(id);
    onChange?.(id);
  }

  return (
    <div>
      <div role="tablist" className="mb-4 flex gap-1 border-b border-line">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => select(tab.id)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm transition-colors",
              active === tab.id ? "border-cobalt font-medium text-ink" : "border-transparent text-ink/60 hover:text-ink",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{children(active)}</div>
    </div>
  );
}
