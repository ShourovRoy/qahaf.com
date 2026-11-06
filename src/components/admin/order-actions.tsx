"use client";

import { Phone } from "lucide-react";
import { useState, useTransition } from "react";
import { changeOrderStatus, saveAdminNote } from "@/app/actions/admin-orders";
import { toast } from "@/components/toaster";
import { Button, type ButtonStyle } from "@/components/ui/button";
import { Textarea } from "@/components/ui/form";

type Status = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "rejected";

const ACTION: Partial<Record<Status, { label: string; variant: ButtonStyle["variant"]; needsReason?: boolean }>> = {
  confirmed: { label: "Confirm order", variant: "primary" },
  rejected: { label: "Reject", variant: "danger", needsReason: true },
  processing: { label: "Mark processing", variant: "secondary" },
  shipped: { label: "Mark shipped", variant: "primary" },
  delivered: { label: "Mark delivered (cash collected)", variant: "primary" },
  cancelled: { label: "Cancel order", variant: "ghost", needsReason: true },
};

export function OrderActions({ orderId, status, allowed, adminNote, phone }: { orderId: string; status: Status; allowed: Status[]; adminNote: string; phone: string }) {
  const [pending, start] = useTransition();
  const [reasonFor, setReasonFor] = useState<Status | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState(adminNote);

  function run(to: Status, why?: string) {
    start(async () => {
      const res = await changeOrderStatus({ orderId, to: to as Exclude<Status, "pending">, note: why || undefined });
      if (!res.ok) return toast(res.error, "error");
      toast(`Order ${to}`);
      setReasonFor(null);
      setReason("");
    });
  }

  return (
    <section className="rounded-sm border border-chocolate/15 bg-surface p-5">
      {status === "pending" && (
        <p className="mb-4 flex items-center gap-2 text-sm text-chocolate">
          <Phone size={14} /> Call the customer at <a href={`tel:${phone}`} className="font-medium text-espresso underline underline-offset-4">{phone.replace(/^\+88/, "")}</a> to verify before confirming.
        </p>
      )}
      {allowed.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {allowed.map((to) => {
            const a = ACTION[to];
            if (!a) return null;
            return (
              <Button key={to} variant={a.variant} size="sm" disabled={pending} onClick={() => (a.needsReason ? setReasonFor(to) : run(to))}>
                {a.label}
              </Button>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-chocolate">This order is closed. No further status changes are possible.</p>
      )}

      {reasonFor && (
        <div className="mt-4 space-y-2">
          <label htmlFor="reason" className="text-xs uppercase tracking-wider text-chocolate">Reason (shared with the customer)</label>
          <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. Could not reach customer after 3 calls" />
          <div className="flex gap-2">
            <Button size="sm" variant="danger" disabled={pending || !reason.trim()} onClick={() => run(reasonFor, reason.trim())}>
              {ACTION[reasonFor]?.label}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setReasonFor(null)}>Back</Button>
          </div>
        </div>
      )}

      <div className="mt-5 border-t border-chocolate/10 pt-4">
        <label htmlFor="admin-note" className="text-xs uppercase tracking-wider text-chocolate">Internal note</label>
        <Textarea id="admin-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1.5" placeholder="Only visible to admins" />
        <Button
          size="sm"
          variant="secondary"
          className="mt-2"
          disabled={pending || note === adminNote}
          onClick={() => start(async () => { await saveAdminNote(orderId, note); toast("Note saved"); })}
        >
          Save note
        </Button>
      </div>
    </section>
  );
}
