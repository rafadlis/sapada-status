"use client";

import { AdminSelect } from "@/components/admin-select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { incidentStates, maintenanceStates, stateLabel } from "@/lib/incident";

type AdminIncidentDialogProps = {
  id: number;
  title: string;
  kind: string;
  state: string;
};

export function AdminIncidentDialog({ id, title, kind, state }: AdminIncidentDialogProps) {
  const options = (kind === "maintenance" ? maintenanceStates : incidentStates)
    .map((value) => ({ value, label: stateLabel(value) }));

  return <Dialog>
    <DialogTrigger render={<Button type="button" variant="outline" size="sm" aria-label={`Perbarui ${title}`} />}>
      Perbarui
    </DialogTrigger>
    <DialogContent className="admin-update-dialog sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Perbarui informasi</DialogTitle>
        <DialogDescription>{title}</DialogDescription>
      </DialogHeader>
      <form className="admin-form admin-dialog-form" action={`/api/admin/incidents/${id}`} method="post">
        <AdminSelect id={`state-${id}`} label="Tahap berikutnya" name="state" defaultValue={state} options={options} />
        <label htmlFor={`note-${id}`}>Catatan pembaruan</label>
        <textarea id={`note-${id}`} name="message" rows={4} maxLength={2000} placeholder="Jelaskan perkembangan terbaru kepada publik." required />
        <DialogFooter className="admin-dialog-actions">
          <DialogClose render={<Button type="button" variant="outline" />}>Batal</DialogClose>
          <Button type="submit">Terbitkan pembaruan</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
