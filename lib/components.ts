export const components = [
  { key: "sapada-tte", name: "TTE", parentKey: "sapada" },
  { key: "sapada-storage", name: "Storage", parentKey: "sapada" },
  { key: "sapada-payment", name: "Payment API", parentKey: "sapada" },
  { key: "sapada-atr-bpn", name: "ATR BPN API", parentKey: "sapada" },
] as const;

export function getComponent(value: string | null | undefined) {
  return components.find((component) => component.key === value);
}
