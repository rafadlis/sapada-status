import { getService, services } from "@/lib/services";

export const allServicesKey = "all";

export function isIncidentServiceKey(value: string) {
  return value === allServicesKey || Boolean(getService(value));
}

export function incidentServiceLabel(value: string) {
  return value === allServicesKey ? "Semua layanan" : getService(value)?.name ?? "Layanan";
}

export function incidentAffectsService(incidentServiceKey: string, serviceKey: string) {
  return incidentServiceKey === allServicesKey || incidentServiceKey === serviceKey;
}

export function getIncidentServices(value: string) {
  return value === allServicesKey ? services : services.filter((service) => service.key === value);
}
