"use client";

import { Eye, EyeOff, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type ComponentProps, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { requestPasswordReset, resetPassword, signIn, signUp } from "@/app/actions/auth";
import { normalizeBdPhone } from "@/lib/phone";
import { safeNext } from "./auth-shell";

type Msg = { error?: string; success?: string } | null;

function PasswordInput(props: ComponentProps<"input">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-10" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-chocolate" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function CheckEmail({ email, title, text }: { email: string; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <MailCheck size={32} strokeWidth={1.25} className="text-chocolate" />
      <p className="heading-display text-2xl">{title}</p>
      <p className="text-sm text-chocolate">{text} <span className="font-medium text-espresso">{email}</span>.</p>
      <p className="text-xs text-chocolate/70">Can&apos;t find it? Check your spam folder.</p>
    </div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [msg, setMsg] = useState<Msg>(
    params.get("verified")
      ? { success: "Email verified. Please sign in." }
      : params.get("reset")
        ? { success: "Password updated. Please sign in." }
        : params.get("error") === "invalid-link"
        ? { error: "That link is invalid or has expired. Sign in to get a new one." }
        : null,
  );
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    setMsg(null);
    const res = await signIn({
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      remember: fd.get("remember") === "on",
      next,
    });
    setPending(false);
    if (res?.code === "EMAIL_NOT_VERIFIED") {
      return setMsg({ error: "Please verify your email first. We've sent you a new verification link." });
    }
    if (res?.error) return setMsg({ error: res.error });
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password">
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </Field>
      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-chocolate">
          <input type="checkbox" name="remember" defaultChecked className="accent-espresso" /> Remember me
        </label>
        <Link href="/forgot-password" className="text-chocolate underline underline-offset-4">Forgot password?</Link>
      </div>
      <FormMessage state={msg} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

export function RegisterForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [msg, setMsg] = useState<Msg>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sentTo, setSentTo] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values = Object.fromEntries(fd) as Record<string, string>;
    const errs: Record<string, string> = {};
    if (values.name.trim().length < 2) errs.name = "Enter your full name.";
    const phone = normalizeBdPhone(values.phone);
    if (!phone) errs.phone = "Enter a valid Bangladeshi mobile number.";
    if (values.password.length < 8) errs.password = "Use at least 8 characters.";
    if (values.password !== values.confirm) errs.confirm = "Passwords don't match.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setPending(true);
    setMsg(null);
    const res = await signUp({ name: values.name, email: values.email, password: values.password, phone: phone!, next });
    setPending(false);
    if (res?.error) return setMsg({ error: res.error });
    setSentTo(values.email);
  }

  if (sentTo) return <CheckEmail email={sentTo} title="Verify your email" text="We've sent a verification link to" />;

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field label="Full name" htmlFor="name" error={errors.name}>
        <Input id="name" name="name" autoComplete="name" required />
      </Field>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Mobile number" htmlFor="phone" error={errors.phone} hint="Bangladeshi number, e.g. 01712-345678">
        <Input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="01XXXXXXXXX" required />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters">
        <PasswordInput id="password" name="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={errors.confirm}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required />
      </Field>
      <FormMessage state={msg} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Creating account…" : "Create account"}</Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string>();
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    setPending(true);
    const res = await requestPasswordReset({ email }).catch(() => ({ error: "Something went wrong. Please try again." }));
    setPending(false);
    if (res?.error) return setMsg({ error: res.error });
    setSentTo(email);
  }

  if (sentTo) return <CheckEmail email={sentTo} title="Check your inbox" text="If an account exists, a reset link has been sent to" />;

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <FormMessage state={msg} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Sending…" : "Send reset link"}</Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const [msg, setMsg] = useState<Msg>(params.get("error") ? { error: "This reset link is invalid or has expired." } : null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));
    if (password.length < 8) return setMsg({ error: "Use at least 8 characters." });
    if (password !== fd.get("confirm")) return setMsg({ error: "Passwords don't match." });
    setPending(true);
    const res = await resetPassword({ password, token: token! });
    setPending(false);
    if (res?.error) return setMsg({ error: res.error });
    router.replace("/login?reset=1");
  }

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <FormMessage state={msg ?? { error: "This reset link is invalid or has expired." }} />
        <Link href="/forgot-password" className="text-sm underline underline-offset-4">Request a new link</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="New password" htmlFor="password" hint="At least 8 characters">
        <PasswordInput id="password" name="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm password" htmlFor="confirm">
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" required />
      </Field>
      <FormMessage state={msg} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>{pending ? "Saving…" : "Reset password"}</Button>
    </form>
  );
}
