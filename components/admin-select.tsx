"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { value: string; label: string };

type AdminSelectProps = {
  id: string;
  label: string;
  name: string;
  options: Option[];
  defaultValue: string;
  required?: boolean;
};

export function AdminSelect({ id, label, name, options, defaultValue, required }: AdminSelectProps) {
  return <>
    <label id={`${id}-label`} htmlFor={id}>{label}</label>
    <Select items={options} name={name} defaultValue={defaultValue} required={required}>
      <SelectTrigger id={id} aria-labelledby={`${id}-label`} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="start" alignItemWithTrigger={false}>
        <SelectGroup>
          {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectGroup>
      </SelectContent>
    </Select>
  </>;
}
