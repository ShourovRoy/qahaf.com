"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/form";
import { cn } from "@/lib/cn";

type Current = { sort: string; size: string; sale: boolean; min: string; max: string; q: string };

const SORT_LABELS: Record<string, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Top rated",
};

export function ListingFilters({ total, sizes, current }: { total: number; sizes: string[]; current: Current }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(current);

  function go(next: Partial<Current>) {
    const merged = { ...current, ...next };
    const q = new URLSearchParams();
    if (merged.q) q.set("q", merged.q);
    if (merged.sort && merged.sort !== "featured") q.set("sort", merged.sort);
    if (merged.size) q.set("size", merged.size);
    if (merged.sale) q.set("sale", "1");
    if (merged.min) q.set("min", merged.min);
    if (merged.max) q.set("max", merged.max);
    router.push(q.size ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  const activeCount = [current.size, current.sale, current.min, current.max].filter(Boolean).length;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-3 border-y border-chocolate/10 py-3">
        <button type="button" onClick={() => { setDraft(current); setOpen((o) => !o); }} className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-espresso" aria-expanded={open}>
          <SlidersHorizontal size={16} strokeWidth={1.5} />
          Filter{activeCount > 0 && ` (${activeCount})`}
        </button>
        <p className="hidden text-xs text-chocolate sm:block">{total} {total === 1 ? "product" : "products"}</p>
        <label className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-chocolate">
          <span className="hidden sm:inline">Sort</span>
          <select
            value={current.sort}
            onChange={(e) => go({ sort: e.target.value })}
            className="h-9 rounded-sm border border-chocolate/25 bg-ivory px-2 text-xs normal-case tracking-normal text-espresso focus:border-espresso focus:outline-none"
            aria-label="Sort products"
          >
            {Object.entries(SORT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
      </div>

      {current.q && (
        <p className="mt-4 text-sm text-chocolate">
          Results for <span className="font-medium text-espresso">“{current.q}”</span>{" "}
          <button type="button" className="ml-1 underline" onClick={() => go({ q: "" })}>clear</button>
        </p>
      )}

      {open && (
        <form
          className="grid gap-5 border-b border-chocolate/10 py-6 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
            go(draft);
          }}
        >
          <div>
            <Label>Size</Label>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, size: d.size === s ? "" : s }))}
                  className={cn(
                    "h-9 min-w-10 rounded-sm border px-2 text-xs",
                    draft.size === s ? "border-espresso bg-espresso text-ivory" : "border-chocolate/30 hover:border-espresso",
                  )}
                  aria-pressed={draft.size === s}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="f-min">Price (৳)</Label>
            <div className="flex items-center gap-2">
              <Input id="f-min" inputMode="numeric" placeholder="Min" value={draft.min} onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value.replace(/\D/g, "") }))} />
              <span className="text-chocolate">–</span>
              <Input aria-label="Max price" inputMode="numeric" placeholder="Max" value={draft.max} onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value.replace(/\D/g, "") }))} />
            </div>
          </div>
          <div>
            <Label htmlFor="f-sale">Offers</Label>
            <Select id="f-sale" value={draft.sale ? "1" : ""} onChange={(e) => setDraft((d) => ({ ...d, sale: e.target.value === "1" }))}>
              <option value="">All products</option>
              <option value="1">On sale only</option>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button type="submit" className="flex-1">Apply</Button>
            <Button type="button" variant="secondary" onClick={() => { setOpen(false); go({ size: "", sale: false, min: "", max: "" }); }} aria-label="Clear filters">
              <X size={16} />
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
