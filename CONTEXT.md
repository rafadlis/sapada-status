# Bapenda service status

The public status page reports access to Bapenda Garut's monitored services, the health of SAPADA integrations, and updates published by its administrators.

## Language

**Layanan**:
One monitored public Bapenda website.

**Komponen**:
One monitored part of SAPADA, including the public website and its integrations. Integration checks run from the SAPADA server so VPN routes can be reached. The public page does not expose private endpoint URLs.

**Status keseluruhan SAPADA**:
The combined health of the SAPADA website and all its monitored integrations. It is degraded when any component fails, unknown when no component fails but at least one has no recent result, and operational when every component is healthy.

**Informasi layanan**:
A public report of a disruption or planned maintenance with one update timeline. It can concern one layanan or all monitored layanan. A SAPADA report identifies the affected components; older reports without that selection refer to SAPADA as a whole.
