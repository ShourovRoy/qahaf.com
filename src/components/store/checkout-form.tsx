"use client";

import { useActionState, useState } from "react";
import { placeOrder } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { AddressFields, emptyAddress, type AddressValue } from "./address-fields";

type SavedAddress = AddressValue & { id: string; label: string };

export function CheckoutForm({
  addresses,
  defaults,
  subtotal,
  shipping,
}: {
  addresses: SavedAddress[];
  defaults: { fullName: string; phone: string };
  subtotal: number;
  shipping: { inside: number; outside: number; freeOver: number };
}) {
  const [state, action, pending] = useActionState(placeOrder, null);
  const [selected, setSelected] = useState<string>(addresses[0]?.id ?? "new");
  const [addr, setAddr] = useState<AddressValue>(() => {
    const first = addresses[0];
    return first ? pick(first) : { ...emptyAddress, ...defaults };
  });

  const free = shipping.freeOver > 0 && subtotal >= shipping.freeOver;
  const fee = !addr.district ? null : free ? 0 : addr.district === "Dhaka" ? shipping.inside : shipping.outside;

  return (
    <form action={action} className="space-y-8">
      <section>
        <h2 className="eyebrow mb-4">Shipping address</h2>
        {addresses.length > 0 && (
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            {addresses.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => { setSelected(a.id); setAddr(pick(a)); }}
                className={cn("rounded-sm border p-4 text-left text-sm", selected === a.id ? "border-espresso bg-surface" : "border-chocolate/20 hover:border-chocolate")}
                aria-pressed={selected === a.id}
              >
                <p className="font-medium">{a.label} · {a.fullName}</p>
                <p className="mt-1 text-xs text-chocolate">{a.addressLine}, {a.area}, {a.district} {a.postcode}</p>
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setSelected("new"); setAddr({ ...emptyAddress, ...defaults }); }}
              className={cn("rounded-sm border border-dashed p-4 text-left text-sm", selected === "new" ? "border-espresso bg-surface" : "border-chocolate/30")}
            >
              + New address
            </button>
          </div>
        )}
        <AddressFields value={addr} onChange={setAddr} errors={state?.fieldErrors} prefix="co" />
        {selected === "new" && (
          <label className="mt-4 flex items-center gap-2 text-sm text-chocolate">
            <input type="checkbox" name="saveAddress" defaultChecked className="accent-espresso" /> Save this address to my account
          </label>
        )}
      </section>

      <Field label="Order note (optional)" htmlFor="note">
        <Textarea id="note" name="note" maxLength={500} rows={2} placeholder="Delivery instructions, preferred time…" />
      </Field>

      <section>
        <h2 className="eyebrow mb-4">Payment</h2>
        <div className="flex items-center gap-3 rounded-sm border border-espresso bg-surface p-4">
          <span className="flex h-4 w-4 items-center justify-center rounded-full border border-espresso"><span className="h-2 w-2 rounded-full bg-espresso" /></span>
          <div>
            <p className="text-sm font-medium">Cash on delivery</p>
            <p className="text-xs text-chocolate">Pay in cash when your order arrives. Our team will call to verify your order.</p>
          </div>
        </div>
      </section>

      <section className="rounded-sm bg-surface p-6">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-chocolate">Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
          <div className="flex justify-between">
            <dt className="text-chocolate">Delivery {addr.district && `(${addr.district === "Dhaka" ? "inside" : "outside"} Dhaka)`}</dt>
            <dd>{fee == null ? "Select district" : fee === 0 ? "Free" : formatPrice(fee)}</dd>
          </div>
        </dl>
        <div className="mt-4 flex justify-between border-t border-chocolate/15 pt-4 text-base font-medium">
          <span>Total</span>
          <span>{formatPrice(subtotal + (fee ?? 0))}</span>
        </div>
        <div className="mt-5 space-y-3">
          <FormMessage state={state} />
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? "Placing order…" : "Place order"}
          </Button>
        </div>
      </section>
    </form>
  );
}

function pick(a: SavedAddress): AddressValue {
  return { fullName: a.fullName, phone: a.phone, division: a.division, district: a.district, area: a.area, addressLine: a.addressLine, postcode: a.postcode };
}
