"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { sapadaIncidentComponents } from "@/lib/incident-components";

export function AdminComponentCheckboxes({ defaultSelected = [] }: { defaultSelected?: string[] }) {
  return <fieldset className="admin-component-fieldset">
    <legend>Komponen terdampak</legend>
    <p>Pilih komponen SAPADA yang mengalami gangguan atau pemeliharaan.</p>
    <div className="admin-component-options">{sapadaIncidentComponents.map((component) => <label key={component.key} className="admin-component-option">
      <Checkbox name="componentKeys" value={component.key} defaultChecked={defaultSelected.includes(component.key)} aria-label={component.name} />
      <span>{component.name}</span>
    </label>)}</div>
  </fieldset>;
}
