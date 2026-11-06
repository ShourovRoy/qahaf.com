"use client";

import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { BD_DIVISIONS, BD_DIVISION_NAMES } from "@/lib/bd-geo";
import type { FieldErrors } from "@/lib/validators";

export type AddressValue = {
  fullName: string;
  phone: string;
  division: string;
  district: string;
  area: string;
  addressLine: string;
  postcode: string;
};

export const emptyAddress: AddressValue = { fullName: "", phone: "", division: "", district: "", area: "", addressLine: "", postcode: "" };

export function AddressFields({
  value,
  onChange,
  errors,
  prefix = "addr",
}: {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  errors?: FieldErrors;
  prefix?: string;
}) {
  const [touched, setTouched] = useState(false);
  const [lastErrors, setLastErrors] = useState(errors);
  // Show new server errors again after each submit.
  if (errors !== lastErrors) {
    setLastErrors(errors);
    setTouched(false);
  }
  const set = (k: keyof AddressValue) => (e: { target: { value: string } }) => {
    setTouched(true);
    onChange({ ...value, [k]: e.target.value, ...(k === "division" ? { district: "" } : {}) });
  };
  const err = (k: string) => (touched ? undefined : errors?.[k]);
  const id = (k: string) => `${prefix}-${k}`;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" htmlFor={id("fullName")} error={err("fullName")}>
        <Input id={id("fullName")} name="fullName" autoComplete="name" value={value.fullName} onChange={set("fullName")} required />
      </Field>
      <Field label="Mobile number" htmlFor={id("phone")} error={err("phone")} hint="Bangladeshi number, e.g. 01712-345678">
        <Input id={id("phone")} name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" value={value.phone.replace(/^\+88/, "")} onChange={set("phone")} required />
      </Field>
      <Field label="Division" htmlFor={id("division")} error={err("division")}>
        <Select id={id("division")} name="division" value={value.division} onChange={set("division")} required>
          <option value="">Select division</option>
          {BD_DIVISION_NAMES.map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
      </Field>
      <Field label="District" htmlFor={id("district")} error={err("district")}>
        <Select id={id("district")} name="district" value={value.district} onChange={set("district")} disabled={!value.division} required>
          <option value="">Select district</option>
          {(BD_DIVISIONS[value.division] ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
      </Field>
      <Field label="Area / Thana" htmlFor={id("area")} error={err("area")}>
        <Input id={id("area")} name="area" value={value.area} onChange={set("area")} placeholder="e.g. Dhanmondi" required />
      </Field>
      <Field label="Postcode" htmlFor={id("postcode")} error={err("postcode")}>
        <Input id={id("postcode")} name="postcode" inputMode="numeric" autoComplete="postal-code" maxLength={4} placeholder="1209" value={value.postcode} onChange={set("postcode")} required />
      </Field>
      <Field label="Address" htmlFor={id("addressLine")} error={err("addressLine")} className="sm:col-span-2">
        <Textarea id={id("addressLine")} name="addressLine" autoComplete="street-address" rows={2} value={value.addressLine} onChange={set("addressLine")} placeholder="House, road, block, landmark" required />
      </Field>
    </div>
  );
}
