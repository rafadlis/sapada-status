"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Recipient = { id: number; name: string; phone: string };

export function AdminRecipientDialog({ recipient }: { recipient?: Recipient }) {
  const suffix = recipient?.id ?? "new";
  return <Dialog>
    <DialogTrigger render={<Button type="button" variant="outline" size="sm" />}>
      {recipient ? "Edit" : "Tambah penerima"}
    </DialogTrigger>
    <DialogContent className="admin-update-dialog sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>{recipient ? "Edit penerima WhatsApp" : "Tambah penerima WhatsApp"}</DialogTitle>
        <DialogDescription>Penerima aktif mendapat peringatan saat gangguan baru terdeteksi.</DialogDescription>
      </DialogHeader>
      <form className="admin-form admin-dialog-form" action="/api/admin/whatsapp-recipients" method="post">
        <input type="hidden" name="intent" value={recipient ? "update" : "add"} />
        {recipient && <input type="hidden" name="id" value={recipient.id} />}
        <label htmlFor={`recipient-name-${suffix}`}>Nama (opsional)</label>
        <input id={`recipient-name-${suffix}`} name="name" maxLength={80} defaultValue={recipient?.name} autoComplete="off" />
        <label htmlFor={`recipient-phone-${suffix}`}>Nomor WhatsApp</label>
        <input id={`recipient-phone-${suffix}`} name="phone" type="tel" maxLength={25} defaultValue={recipient?.phone} placeholder="6281234567890" autoComplete="off" required />
        <p className="form-hint">Gunakan kode negara, misalnya 62 untuk Indonesia.</p>
        <DialogFooter className="admin-dialog-actions">
          <DialogClose render={<Button type="button" variant="outline" />}>Batal</DialogClose>
          <Button type="submit">Simpan penerima</Button>
        </DialogFooter>
      </form>
      {recipient && <form action="/api/admin/whatsapp-recipients" method="post" className="admin-recipient-remove">
        <input type="hidden" name="intent" value="remove" /><input type="hidden" name="id" value={recipient.id} />
        <Button type="submit" variant="destructive" size="sm">Hapus penerima ini</Button>
      </form>}
    </DialogContent>
  </Dialog>;
}
