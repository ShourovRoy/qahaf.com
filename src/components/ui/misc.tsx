import { Star } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Badge({ children, tone = "accent", className }: { children: ReactNode; tone?: "accent" | "dark" | "outline" | "success" | "danger" | "warning"; className?: string }) {
  const tones = {
    accent: "bg-tan text-espresso",
    dark: "bg-espresso text-ivory",
    outline: "border border-chocolate/40 text-chocolate",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
    warning: "bg-warning/10 text-warning",
  };
  return (
    <span className={cn("inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          width={size}
          height={size}
          aria-hidden
          className={i <= Math.round(value) ? "fill-tan text-tan" : "fill-transparent text-chocolate/30"}
        />
      ))}
    </span>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-chocolate/20 bg-surface px-6 py-16 text-center">
      <p className="heading-display text-2xl">{title}</p>
      {children && <div className="max-w-sm text-sm text-chocolate">{children}</div>}
      {action}
    </div>
  );
}

export function PageHeading({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-2 text-chocolate">{eyebrow}</p>}
        <h1 className="heading-display text-3xl sm:text-4xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-sm bg-ivory-alt", className)} />;
}
