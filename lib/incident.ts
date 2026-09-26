export const incidentStates = ["investigating", "identified", "monitoring", "resolved"] as const;
export const maintenanceStates = ["scheduled", "in_progress", "resolved"] as const;

export type IncidentKind = "incident" | "maintenance";
export type IncidentState = (typeof incidentStates)[number] | (typeof maintenanceStates)[number];

export function isIncidentKind(value: string): value is IncidentKind {
  return value === "incident" || value === "maintenance";
}

export function isValidIncidentState(kind: IncidentKind, value: string): value is IncidentState {
  return kind === "maintenance"
    ? maintenanceStates.some((state) => state === value)
    : incidentStates.some((state) => state === value);
}

export function stateLabel(state: string) {
  switch (state) {
    case "investigating": return "Sedang diselidiki";
    case "identified": return "Penyebab diketahui";
    case "monitoring": return "Dalam pemantauan";
    case "scheduled": return "Dijadwalkan";
    case "in_progress": return "Sedang berlangsung";
    case "resolved": return "Selesai";
    default: return "Pembaruan";
  }
}

export function kindLabel(kind: string) {
  return kind === "maintenance" ? "Pemeliharaan" : "Gangguan";
}

export function initialState(kind: IncidentKind): IncidentState {
  return kind === "maintenance" ? "scheduled" : "investigating";
}
