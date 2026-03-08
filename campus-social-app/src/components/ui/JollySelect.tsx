import React from "react";

import { GlassDropdown, GlassDropdownOption } from "./GlassDropdown";

export type JollySelectOption = {
  label: string;
  value: string;
  description?: string;
  section?: string;
  icon?: React.ReactNode;
  swatchColor?: string;
};

type JollySelectProps = {
  label?: string;
  placeholder?: string;
  value: string;
  options: JollySelectOption[];
  onValueChange: (value: string) => void;
};

export function JollySelect({
  label,
  placeholder = "Select",
  value,
  options,
  onValueChange,
}: JollySelectProps) {
  const normalizedOptions: GlassDropdownOption[] = options.map((option) => ({
    label: option.label,
    value: option.value,
    description: option.description,
    section: option.section,
    icon: option.icon,
    swatchColor: option.swatchColor,
  }));

  return (
    <GlassDropdown
      label={label}
      placeholder={placeholder}
      panelTitle={label ?? "Select"}
      value={value}
      options={normalizedOptions}
      onValueChange={onValueChange}
    />
  );
}
