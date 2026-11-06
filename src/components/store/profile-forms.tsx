"use client";

import { useActionState, useState } from "react";
import { updateProfile } from "@/app/actions/account";
import { changeEmail, changePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";

type Msg = { error?: string; success?: string } | null;

export function ProfileForm({ name, phone }: { name: string; phone: string }) {
  const [state, action, pending] = useActionState(updateProfile, null);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" htmlFor="p-name" error={state?.fieldErrors?.name}>
        <Input id="p-name" name="name" defaultValue={name} autoComplete="name" required />
      </Field>
      <Field label="Mobile number" htmlFor="p-phone" error={state?.fieldErrors?.phone}>
        <Input id="p-phone" name="phone" type="tel" defaultValue={phone.replace(/^\+88/, "")} autoComplete="tel" required />
      </Field>
      <div className="space-y-3 sm:col-span-2">
        <FormMessage state={state} />
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
      </div>
    </form>
  );
}

export function ChangeEmailForm({ email }: { email: string }) {
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const newEmail = String(new FormData(e.currentTarget).get("email")).trim().toLowerCase();
    if (newEmail === email) return setMsg({ error: "That's already your email." });
    setPending(true);
    const res = await changeEmail({ email: newEmail }).catch(() => ({ error: "Could not send the confirmation email." }));
    setPending(false);
    setMsg(res?.error ? { error: res.error } : { success: `We've sent a confirmation link to ${newEmail}.` });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-chocolate">Current: <span className="text-espresso">{email}</span></p>
      <Field label="New email" htmlFor="p-email">
        <Input id="p-email" name="email" type="email" autoComplete="email" required />
      </Field>
      <FormMessage state={msg} />
      <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Sending…" : "Change email"}</Button>
    </form>
  );
}

export function ChangePasswordForm() {
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const newPassword = String(fd.get("new"));
    if (newPassword.length < 8) return setMsg({ error: "Use at least 8 characters." });
    if (newPassword !== fd.get("confirm")) return setMsg({ error: "Passwords don't match." });
    setPending(true);
    const res = await changePassword({ current: String(fd.get("current")), next: newPassword });
    setPending(false);
    if (res?.error) return setMsg({ error: res.error });
    form.reset();
    setMsg({ success: "Password updated. Other devices have been signed out." });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
      <Field label="Current password" htmlFor="pw-current">
        <Input id="pw-current" name="current" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password" htmlFor="pw-new">
        <Input id="pw-new" name="new" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm" htmlFor="pw-confirm">
        <Input id="pw-confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <div className="space-y-3 sm:col-span-3">
        <FormMessage state={msg} />
        <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Updating…" : "Update password"}</Button>
      </div>
    </form>
  );
}
