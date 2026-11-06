import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-sm border border-chocolate/30 bg-ivory px-3 text-sm text-espresso placeholder:text-chocolate/50 transition-colors focus:border-espresso focus:outline-none disabled:opacity-60 aria-invalid:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 py-2.5", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "h-11 pr-8", className)} {...props} />;
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("mb-1.5 block text-xs font-medium uppercase tracking-wider text-chocolate", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string | string[];
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {message ? (
        <p className="mt-1 text-xs text-danger">{message}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-chocolate/70">{hint}</p>
      ) : null}
    </div>
  );
}

export function FormMessage({ state }: { state?: { error?: string; success?: string } | null }) {
  if (state?.error) return <p className="rounded-sm border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">{state.error}</p>;
  if (state?.success) return <p className="rounded-sm border border-success/30 bg-success/5 px-3 py-2 text-sm text-success" role="status">{state.success}</p>;
  return null;
}
