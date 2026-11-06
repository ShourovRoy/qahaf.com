"use client";

import { Check, Copy } from "lucide-react";
import { useActionState, useState } from "react";
import { placeOrder } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { AddressFields, emptyAddress, type AddressValue } from "./address-fields";

type SavedAddress = AddressValue & { id: string; label: string };

export function CheckoutForm({
  addresses,
  defaults,
  subtotal,
  shipping,
  bkash,
}: {
  addresses: SavedAddress[];
  defaults: { fullName: string; phone: string };
  subtotal: number;
  shipping: { inside: number; outside: number; freeOver: number };
  // Null when the store hasn't turned bKash on.
  bkash: { number: string; menu: string } | null;
}) {
  const [state, action, pending] = useActionState(placeOrder, null);
  const [method, setMethod] = useState<"cod" | "bkash">("cod");
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
        <div className="space-y-3" role="radiogroup" aria-label="Payment method">
          <PaymentOption
            value="cod"
            checked={method === "cod"}
            onSelect={setMethod}
            title="Cash on delivery"
            text="Pay in cash when your order arrives. Our team will call to verify your order."
          />
          {bkash && (
            <PaymentOption
              value="bkash"
              checked={method === "bkash"}
              onSelect={setMethod}
              title="bKash"
              text="Send the total to our bKash number, then enter the transaction ID."
            >
              <BkashSteps
                bkash={bkash}
                amount={fee == null ? null : subtotal + fee}
                errors={state?.fieldErrors}
                defaultSender={defaults.phone}
              />
            </PaymentOption>
          )}
        </div>
        {/* Hidden copy of the choice: React resets form fields after each submit, which would clear the radio. */}
        <input type="hidden" name="paymentMethod" value={method} />
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
            {pending ? "Placing order…" : method === "bkash" ? "Place order with bKash" : "Place order"}
          </Button>
        </div>
      </section>
    </form>
  );
}

function PaymentOption({
  value,
  checked,
  onSelect,
  title,
  text,
  children,
}: {
  value: "cod" | "bkash";
  checked: boolean;
  onSelect: (v: "cod" | "bkash") => void;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-sm border", checked ? "border-espresso bg-surface" : "border-chocolate/20 hover:border-chocolate")}>
      <label className="flex cursor-pointer items-start gap-3 p-4">
        <input type="radio" name="paymentChoice" value={value} checked={checked} onChange={() => onSelect(value)} className="mt-0.5 h-4 w-4 accent-espresso" />
        <span>
          <span className="block text-sm font-medium">{title}</span>
          <span className="block text-xs text-chocolate">{text}</span>
        </span>
      </label>
      {checked && children}
    </div>
  );
}

function BkashSteps({
  bkash,
  amount,
  errors,
  defaultSender,
}: {
  bkash: { number: string; menu: string };
  amount: number | null;
  errors?: Record<string, string[] | undefined>;
  defaultSender: string;
}) {
  const [copied, setCopied] = useState(false);
  // Kept in state so a failed submit doesn't wipe what the customer typed.
  const [trxId, setTrxId] = useState("");
  const [sender, setSender] = useState(defaultSender.replace(/^\+88/, ""));

  function copy() {
    navigator.clipboard?.writeText(bkash.number).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="space-y-4 border-t border-chocolate/15 px-4 pb-5 pt-4">
      <ol className="space-y-3 text-sm">
        <li className="flex gap-3">
          <Step n={1} />
          <div className="min-w-0 flex-1">
            <p>Open the bKash app and choose <strong className="font-medium">{bkash.menu}</strong>.</p>
          </div>
        </li>
        <li className="flex gap-3">
          <Step n={2} />
          <div className="min-w-0 flex-1">
            <p>Send to this number:</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="rounded-sm border border-chocolate/30 bg-ivory px-3 py-1.5 font-mono text-base tracking-wider text-espresso">{bkash.number}</span>
              <button type="button" onClick={copy} className="inline-flex items-center gap-1 rounded-sm px-2 py-1.5 text-xs uppercase tracking-wider text-chocolate hover:bg-ivory-alt">
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        </li>
        <li className="flex gap-3">
          <Step n={3} />
          <div className="min-w-0 flex-1">
            <p>
              Amount: <strong className="font-medium">{amount == null ? "choose your district first" : formatPrice(amount)}</strong>
            </p>
            <p className="text-xs text-chocolate">Send the exact order total, including delivery.</p>
          </div>
        </li>
        <li className="flex gap-3">
          <Step n={4} />
          <p className="min-w-0 flex-1">Enter the TrxID from your bKash message below and place your order.</p>
        </li>
      </ol>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="bKash TrxID" htmlFor="bkashTrxId" error={errors?.bkashTrxId} hint="10 letters and numbers, e.g. 9A7B6C5D4E">
          <Input
            id="bkashTrxId"
            name="bkashTrxId"
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={14}
            className="font-mono uppercase tracking-wider"
            value={trxId}
            onChange={(e) => setTrxId(e.target.value)}
            aria-invalid={!!errors?.bkashTrxId}
          />
        </Field>
        <Field label="Your bKash number" htmlFor="bkashSender" error={errors?.bkashSender} hint="The number you sent the money from">
          <Input
            id="bkashSender"
            name="bkashSender"
            required
            inputMode="tel"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            aria-invalid={!!errors?.bkashSender}
          />
        </Field>
      </div>
    </div>
  );
}

function Step({ n }: { n: number }) {
  return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-espresso text-xs text-ivory">{n}</span>;
}

function pick(a: SavedAddress): AddressValue {
  return { fullName: a.fullName, phone: a.phone, division: a.division, district: a.district, area: a.area, addressLine: a.addressLine, postcode: a.postcode };
}
