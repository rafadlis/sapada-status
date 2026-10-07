# Bapenda service status

The public status page reports access to Bapenda Garut's monitored services, the health of SAPADA integrations, and updates published by its administrators.

## Language

**Layanan**:
One monitored public Bapenda website.

**Komponen**:
One monitored part of SAPADA, including the public website and its integrations. Integration checks run from the SAPADA server so VPN routes can be reached. The public page does not expose private endpoint URLs.

**Status keseluruhan SAPADA**:
The combined health of the SAPADA website and all its monitored integrations. It is degraded when any component fails, unknown when no component fails but at least one has no recent result, and operational when every component is healthy.

The historical parent chart includes every recorded monitoring run, even when older runs only checked the website. A run fails if any observed component fails. Missing components do not remove a run from history. Tooltips identify runs that cover only some components; historical percentages describe the components observed at that time.

Payments have separate QRIS, Virtual Account BJB and Kode Bayar monitors. Old Payment API observations remain in SAPADA's combined history without becoming method-specific observations. The public version 1 feed aggregates the three payment states into its existing Payment API key for SAPADA compatibility. The protected probe requests version 2; an older probe leaves the three payment states unknown while retaining its other results. Kode Bayar monitors the local bank inquiry/payment guards and VPN listener, without sending credentials or creating a payment. It does not prove the bank's complete network path or settlement.

The public feed adds `paymentMethods` observations and incident `affectedPaymentMethodKeys` without changing its five legacy components. SAPADA notices name QRIS, Virtual Account BJB or Kode Bayar when specific details are available, and retain "Pembayaran" for broad or legacy payment incidents.

History bar colors summarize the success rate within each bucket. Green means at least 99% of observed checks succeeded, yellow means some succeeded but the rate is below 99%, red means every recorded check failed, and gray means no observations. Tooltips retain exact failure counts even on green bars. This visual threshold does not change the recorded checks, uptime calculation, current status, incident confirmation, or WhatsApp alert policy.

**Informasi layanan**:
A public report of a disruption or planned maintenance with one update timeline. It can concern one layanan or all monitored layanan. A SAPADA report identifies the affected components; older reports without that selection refer to SAPADA as a whole.

**Gangguan otomatis**:
A public report created by `/api/check` after at least three failures spanning ten minutes for an individual monitor. A healthy check or a gap over ten minutes resets failure confirmation. SAPADA component failures join one open automatic report. Covered manual reports suppress duplicates. Admins must replace the default title, confirm the cause, and close the report. A component can generate another report after ten minutes of observed recovery and a new confirmed failure. WhatsApp sending uses its separate confirmation and rate limits.
