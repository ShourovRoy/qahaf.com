"use client";

import { useState, useTransition } from "react";
import { settleBkash } from "@/app/actions/admin-orders";
import { PaymentStatusBadge, TxnStatusBadge } from "@/components/order-status";
import { toast } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { formatDateTime, formatPrice } from "@/lib/format";

type PayStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded" | "partially_refunded";

export type BkashCharge = {
  id: string;
  trxId: string | null;
  sender: string | null;
  receiver: string | null;
  amount: number;
  status: "pending" | "succeeded" | "failed" | "cancelled";
  failureReason: string | null;
  createdAt: Date;
};

export function BkashPayment({
  orderId,
  orderClosed,
  paymentStatus,
  charges,
}: {
  orderId: string;
  // Cancelled or rejected: a paid payment then needs a refund.
  orderClosed: boolean;
  paymentStatus: PayStatus;
  charges: BkashCharge[];
}) {
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"reject" | "refund" | null>(null);
  const [text, setText] = useState("");
  const waiting = charges.some((c) => c.status === "pending");
  const canRefund = orderClosed && paymentStatus === "paid";

  function run(action: "verify" | "reject" | "refund") {
    start(async () => {
      const res = await settleBkash({
        orderId,
        action,
        note: action === "reject" ? text.trim() : undefined,
        refundTrxId: action === "refund" ? text.trim() || undefined : undefined,
      });
      if (!res.ok) return toast(res.error, "error");
      toast({ verify: "Payment verified", reject: "Payment marked as not received", refund: "Refund recorded" }[action]);
      setMode(null);
      setText("");
    });
  }

  return (
    <section className="rounded-sm border border-chocolate/15 bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="eyebrow">bKash payment</h2>
        <PaymentStatusBadge status={paymentStatus} />
      </div>

      <ul className="space-y-3">
        {charges.map((c) => (
          <li key={c.id} className="rounded-sm border border-chocolate/15 bg-ivory p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-mono text-base tracking-wider text-espresso">{c.trxId ?? "No TrxID"}</p>
              <TxnStatusBadge status={c.status} />
            </div>
            <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs text-chocolate sm:grid-cols-2">
              <div><dt className="inline">Amount: </dt><dd className="inline font-medium text-espresso">{formatPrice(c.amount)}</dd></div>
              <div><dt className="inline">Sent: </dt><dd className="inline">{formatDateTime(c.createdAt)}</dd></div>
              <div><dt className="inline">From: </dt><dd className="inline">{c.sender?.replace(/^\+88/, "") ?? "—"}</dd></div>
              <div><dt className="inline">To: </dt><dd className="inline">{c.receiver ?? "—"}</dd></div>
            </dl>
            {c.failureReason && <p className="mt-2 text-xs text-danger">Not received: {c.failureReason}</p>}
          </li>
        ))}
      </ul>

      {waiting && (
        <>
          <p className="mt-4 text-sm text-chocolate">
            Find this TrxID in your bKash account and check the amount and sender. Confirming the order is unlocked once the payment is verified.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" disabled={pending} onClick={() => run("verify")}>Payment received</Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setMode("reject")}>Not received</Button>
          </div>
        </>
      )}
      {!waiting && paymentStatus === "failed" && (
        <p className="mt-4 text-sm text-chocolate">The customer can send a new TrxID from their order page. You can also reject the order.</p>
      )}
      {canRefund && (
        <div className="mt-4">
          <p className="text-sm text-chocolate">This order was paid but is now closed. Send the money back in bKash, then record the refund here.</p>
          <Button size="sm" variant="secondary" className="mt-3" disabled={pending} onClick={() => setMode("refund")}>Record refund</Button>
        </div>
      )}

      {mode === "reject" && (
        <div className="mt-4 space-y-2">
          <label htmlFor="bk-reason" className="text-xs uppercase tracking-wider text-chocolate">Reason (shared with the customer)</label>
          <Textarea id="bk-reason" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. No payment with this TrxID in our account" />
          <div className="flex gap-2">
            <Button size="sm" variant="danger" disabled={pending || !text.trim()} onClick={() => run("reject")}>Mark not received</Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)}>Back</Button>
          </div>
        </div>
      )}
      {mode === "refund" && (
        <div className="mt-4 space-y-2">
          <label htmlFor="bk-refund" className="text-xs uppercase tracking-wider text-chocolate">Refund TrxID (optional)</label>
          <Input id="bk-refund" value={text} onChange={(e) => setText(e.target.value)} className="font-mono uppercase" maxLength={20} />
          <div className="flex gap-2">
            <Button size="sm" disabled={pending} onClick={() => run("refund")}>Save refund</Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)}>Back</Button>
          </div>
        </div>
      )}
    </section>
  );
}
