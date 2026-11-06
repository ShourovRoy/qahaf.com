"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/cn";

export type FilterDef = {
  key: string;
  label: string;
  options?: { value: string; label: string }[];
  type?: "select" | "date";
};

export function Toolbar({ searchPlaceholder = "Search", filters = [] }: { searchPlaceholder?: string; filters?: FilterDef[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [pending, start] = useTransition();
  const urlQ = sp.get("q") ?? "";

  function update(changes: Record<string, string>) {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    start(() => router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false }));
  }

  // Debounced search.
  useEffect(() => {
    if (q.trim() === urlQ) return;
    const t = setTimeout(() => update({ q: q.trim() }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = filters.some((f) => sp.get(f.key)) || sp.get("q");

  return (
    <div className={cn("mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center", pending && "opacity-70")}>
      <div className="relative sm:w-72">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-chocolate/60" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="h-10 w-full rounded-sm border border-chocolate/25 bg-ivory pl-9 pr-3 text-sm focus:border-espresso focus:outline-none"
        />
      </div>
      {filters.map((f) =>
        f.type === "date" ? (
          <label key={f.key} className="flex items-center gap-2 text-xs text-chocolate">
            {f.label}
            <input
              type="date"
              value={sp.get(f.key) ?? ""}
              onChange={(e) => update({ [f.key]: e.target.value })}
              className="h-10 rounded-sm border border-chocolate/25 bg-ivory px-2 text-sm text-espresso focus:border-espresso focus:outline-none"
            />
          </label>
        ) : (
          <select
            key={f.key}
            value={sp.get(f.key) ?? ""}
            onChange={(e) => update({ [f.key]: e.target.value })}
            aria-label={f.label}
            className="h-10 rounded-sm border border-chocolate/25 bg-ivory px-2 text-sm focus:border-espresso focus:outline-none"
          >
            <option value="">{f.label}: All</option>
            {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ),
      )}
      {active && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            start(() => router.replace(pathname, { scroll: false }));
          }}
          className="flex h-10 items-center gap-1 px-2 text-xs uppercase tracking-wider text-chocolate hover:text-espresso"
        >
          <X size={14} /> Clear
        </button>
      )}
    </div>
  );
}
