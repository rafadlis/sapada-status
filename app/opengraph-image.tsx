import { ImageResponse } from "next/og";
import { siteName } from "@/lib/seo";

export const alt = siteName;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", background: "#f6f9fc", color: "#17324f", padding: "64px 76px", borderTop: "12px solid #174b86" }}>
      <div style={{ display: "flex", fontSize: 28, fontWeight: 700, letterSpacing: 3 }}>BAPENDA KABUPATEN GARUT</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>Status layanan</div>
        <div style={{ display: "flex", fontSize: 28, lineHeight: 1.5, color: "#526a80" }}>SAPADA · Struk Berhadiah · Simpul PAD · Situs Bapenda</div>
        <div style={{ display: "flex", fontSize: 25, color: "#526a80" }}>Ketersediaan layanan, gangguan, dan pemeliharaan</div>
      </div>
      <div style={{ display: "flex", fontSize: 25, color: "#174b86" }}>status.bapenda.garutkab.go.id</div>
    </div>,
    size,
  );
}
