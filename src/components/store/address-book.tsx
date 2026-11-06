"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteAddress, saveAddress, setDefaultAddress } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { formatBdPhone } from "@/lib/phone";
import { AddressFields, emptyAddress, type AddressValue } from "./address-fields";

type Saved = AddressValue & { id: string; label: string; isDefault: boolean };

export function AddressBook({ addresses, defaults }: { addresses: Saved[]; defaults: { fullName: string; phone: string } }) {
  const [editing, setEditing] = useState<Saved | "new" | null>(addresses.length ? null : "new");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-6">
      {addresses.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="rounded-sm border border-chocolate/15 p-5 text-sm">
              <div className="mb-2 flex items-center gap-2">
                <p className="font-medium">{a.label}</p>
                {a.isDefault && <Badge tone="dark">Default</Badge>}
              </div>
              <p>{a.fullName} · {formatBdPhone(a.phone)}</p>
              <p className="mt-1 text-chocolate">{a.addressLine}, {a.area}, {a.district} {a.postcode}, {a.division}</p>
              <div className="mt-4 flex gap-4 text-xs uppercase tracking-wider">
                <button type="button" className="underline underline-offset-4" onClick={() => setEditing(a)}>Edit</button>
                {!a.isDefault && <button type="button" className="underline underline-offset-4" disabled={pending} onClick={() => start(() => setDefaultAddress(a.id))}>Make default</button>}
                <button type="button" className="text-danger underline underline-offset-4" disabled={pending} onClick={() => confirm("Delete this address?") && start(() => deleteAddress(a.id))}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing ? (
        <AddressEditor key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? null : editing} defaults={defaults} onDone={() => setEditing(null)} />
      ) : (
        <Button variant="secondary" onClick={() => setEditing("new")}>Add address</Button>
      )}
    </div>
  );
}

function AddressEditor({ initial, defaults, onDone }: { initial: Saved | null; defaults: { fullName: string; phone: string }; onDone: () => void }) {
  const [value, setValue] = useState<AddressValue>(initial ?? { ...emptyAddress, ...defaults });
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof saveAddress>>, fd: FormData) => {
    const res = await saveAddress(prev, fd);
    if (res?.success) onDone();
    return res;
  }, null);

  return (
    <form action={action} className="space-y-4 rounded-sm bg-surface p-6">
      <h2 className="eyebrow">{initial ? "Edit address" : "New address"}</h2>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      <Field label="Label" htmlFor="ad-label" className="max-w-xs">
        <Input id="ad-label" name="label" defaultValue={initial?.label ?? "Home"} placeholder="Home, Office…" />
      </Field>
      <AddressFields value={value} onChange={setValue} errors={state?.fieldErrors} prefix="ad" />
      <label className="flex items-center gap-2 text-sm text-chocolate">
        <input type="checkbox" name="isDefault" defaultChecked={initial?.isDefault} className="accent-espresso" /> Set as default
      </label>
      <FormMessage state={state?.error ? state : null} />
      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save address"}</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
