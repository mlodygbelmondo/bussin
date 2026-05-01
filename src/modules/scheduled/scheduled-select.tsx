"use client";

import { ChevronDown } from "lucide-react";

type ScheduledSelectOption = {
  label: string;
  value: string;
};

export function ScheduledSelect({
  name,
  options,
  value,
}: {
  name: string;
  options: ScheduledSelectOption[];
  value: string;
}) {
  return (
    <label className="relative">
      <select
        className="h-10 w-full appearance-none rounded-lg border border-white/10 bg-[#0c1527] px-4 pr-9 text-sm font-medium text-white outline-none"
        defaultValue={value}
        name={name}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {options.map((option) => (
          <option key={`${name}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-3 right-3 size-4 text-slate-400" />
    </label>
  );
}
