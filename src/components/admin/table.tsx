import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { param, type SearchParams, withParams } from "@/lib/search-params";

export function readSort<T extends string>(sp: SearchParams, allowed: readonly T[], fallback: T) {
  const sort = param(sp, "sort") as T | undefined;
  return {
    sort: sort && allowed.includes(sort) ? sort : fallback,
    dir: param(sp, "dir") === "asc" ? ("asc" as const) : ("desc" as const),
  };
}

export function SortHeader({ label, field, base, sp, current, className }: { label: string; field: string; base: string; sp: SearchParams; current: { sort: string; dir: "asc" | "desc" }; className?: string }) {
  const active = current.sort === field;
  const nextDir = active && current.dir === "desc" ? "asc" : "desc";
  const Icon = !active ? ArrowUpDown : current.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={cn("px-4 py-3 font-medium", className)} aria-sort={active ? (current.dir === "asc" ? "ascending" : "descending") : undefined}>
      <Link href={withParams(base, sp, { sort: field, dir: nextDir, page: null })} className="inline-flex items-center gap-1 hover:text-espresso">
        {label}
        <Icon size={12} className={active ? "text-espresso" : "opacity-40"} />
      </Link>
    </th>
  );
}

export function Th({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 font-medium", className)}>{children}</th>;
}

export function Table({ head, children, minWidth = 720 }: { head: ReactNode; children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto rounded-sm border border-chocolate/15 bg-ivory">
      <table className="w-full text-sm" style={{ minWidth }}>
        <thead className="bg-surface text-left text-xs uppercase tracking-wider text-chocolate">
          <tr>{head}</tr>
        </thead>
        <tbody className="divide-y divide-chocolate/10">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}

export function EmptyRow({ cols, children = "Nothing matches these filters." }: { cols: number; children?: ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-12 text-center text-sm text-chocolate">{children}</td>
    </tr>
  );
}

export function AdminHeading({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="heading-display text-3xl sm:text-4xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-chocolate">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "warning" }) {
  return (
    <div className={cn("rounded-sm border p-5", tone === "warning" ? "border-warning/40 bg-warning/5" : "border-chocolate/15 bg-ivory")}>
      <p className="eyebrow text-chocolate">{label}</p>
      <p className="heading-display mt-2 text-3xl">{value}</p>
      {hint && <p className="mt-1 text-xs text-chocolate">{hint}</p>}
    </div>
  );
}
