export const components = [
  { key: "sapada-tte", name: "TTE", parentKey: "sapada" },
  { key: "sapada-storage", name: "Storage", parentKey: "sapada" },
  { key: "sapada-qris", name: "QRIS", parentKey: "sapada" },
  { key: "sapada-va-bjb", name: "Virtual Account BJB", parentKey: "sapada" },
  { key: "sapada-kode-bayar", name: "Kode Bayar", parentKey: "sapada" },
  { key: "sapada-atr-bpn", name: "ATR BPN API", parentKey: "sapada" },
] as const;

// Retained for recorded checks and incidents, never shown as a current monitor.
export const legacyPaymentComponent = { key: "sapada-payment", name: "Payment API", parentKey: "sapada" } as const;
export const paymentComponentKeys = ["sapada-qris", "sapada-va-bjb", "sapada-kode-bayar"] as const;
export const sapadaHistoryKeys = ["sapada", ...components.map((component) => component.key), legacyPaymentComponent.key];

export function getComponent(value: string | null | undefined) {
  return components.find((component) => component.key === value)
    ?? (value === legacyPaymentComponent.key ? legacyPaymentComponent : undefined);
}
