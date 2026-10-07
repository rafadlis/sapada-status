import { components, legacyPaymentComponent } from "@/lib/components";

export const sapadaIncidentComponents = [
  { key: "sapada", name: "Situs SAPADA" },
  ...components.filter((component) => component.parentKey === "sapada"),
];

const historicalIncidentComponents = [...sapadaIncidentComponents, legacyPaymentComponent];
const componentKeys = new Set(historicalIncidentComponents.map((component) => component.key));

export function parseAffectedComponentKeys(serviceKey: string, values: FormDataEntryValue[]) {
  if (serviceKey !== "sapada") return values.length === 0 ? null : undefined;
  const keys = values.map(String);
  if (keys.length === 0 || keys.length > componentKeys.size || new Set(keys).size !== keys.length || keys.some((key) => !componentKeys.has(key))) {
    return undefined;
  }
  return keys;
}

export function affectedComponentNames(keys: string[] | null) {
  if (!keys) return [];
  return historicalIncidentComponents.filter((component) => keys.includes(component.key)).map((component) => component.name);
}
