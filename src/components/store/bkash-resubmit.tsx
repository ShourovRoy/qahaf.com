"use client";

import { useActionState } from "react";
import { resubmitBkashPayment } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";

export function BkashResubmit({ orderId, defaultSender }: { orderId: string; defaultSender: string }) {
  const [state, action, pending] = useActionState(resubmitBkashPayment.bind(null, orderId), null);
  if (state?.success) return <FormMessage state={state} />;

  return (
    <form action={action} className="mt-4 space-y-3 border-t border-chocolate/15 pt-4">
      <p className="text-xs text-chocolate">Sent the money already? Enter the correct TrxID from your bKash message.</p>
      <Field label="bKash TrxID" htmlFor="re-trx" error={state?.fieldErrors?.bkashTrxId}>
        <Input id="re-trx" name="bkashTrxId" required autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={14} className="font-mono uppercase tracking-wider" />
      </Field>
      <Field label="Your bKash number" htmlFor="re-sender" error={state?.fieldErrors?.bkashSender}>
        <Input id="re-sender" name="bkashSender" required inputMode="tel" placeholder="01XXXXXXXXX" defaultValue={defaultSender.replace(/^\+88/, "")} />
      </Field>
      <FormMessage state={state} />
      <Button type="submit" size="sm" className="w-full" disabled={pending}>{pending ? "Sending…" : "Send TrxID"}</Button>
    </form>
  );
}
