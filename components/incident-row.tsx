import Link from "next/link";
import type { PublicIncident } from "@/components/incident-card";
import { formatJakarta } from "@/lib/status";

export function IncidentRow({ incident }: { incident: PublicIncident }) {
  const latest = incident.updates[0];
  const date = incident.createdAt;
  const note = latest?.message || (incident.state === "resolved"
    ? incident.kind === "maintenance" ? "Pemeliharaan telah selesai." : "Gangguan telah selesai."
    : incident.message);
  return <article className={`reference-incident-row ${incident.state === "resolved" ? "row-resolved" : "row-active"}`}>
    <div className="reference-incident-date"><strong>{formatJakarta(date, { day: "numeric" })}</strong><span>{formatJakarta(date, { weekday: "short" })}</span></div>
    <div className="reference-incident-content"><Link href={`/incidents/${incident.id}`}>{incident.title}</Link><p>{note}</p></div>
    <time dateTime={date.toISOString()}>{formatJakarta(date, { timeStyle: "short" })} WIB</time>
  </article>;
}
