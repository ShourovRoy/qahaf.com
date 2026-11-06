"use client";

import { Heart, Minus, Plus, Ruler, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addToCart, toggleWishlist } from "@/app/actions/cart";
import { toast } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import type { SizeChart } from "@/db/schema";
import { cn } from "@/lib/cn";

type Variant = { id: string; size: string; color: string | null; stock: number };

export function ProductPurchase({ productId, variants, sizeChart }: { productId: string; variants: Variant[]; sizeChart: SizeChart | null }) {
  const router = useRouter();
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))] as string[];
  const [color, setColor] = useState<string | null>(colors[0] ?? null);
  const options = variants.filter((v) => (colors.length ? v.color === color : true));
  const [variantId, setVariantId] = useState<string | null>(options.length === 1 && options[0].stock > 0 ? options[0].id : null);
  const [qty, setQty] = useState(1);
  const [chartOpen, setChartOpen] = useState(false);
  const [pending, start] = useTransition();
  const selected = variants.find((v) => v.id === variantId);

  function add(buyNow: boolean) {
    if (!selected) return toast("Please choose a size", "error");
    start(async () => {
      const res = await addToCart({ variantId: selected.id, quantity: qty });
      if (!res.ok) return toast(res.error, "error");
      if (buyNow) router.push("/checkout");
      else toast(res.message ?? "Added to bag");
    });
  }

  function wishlist() {
    start(async () => {
      const res = await toggleWishlist(productId);
      if (!res.ok) {
        if (res.requiresLogin) router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
        return toast(res.error, "error");
      }
      toast(res.message ?? "Saved");
    });
  }

  return (
    <div className="mt-6 space-y-6">
      {colors.length > 0 && (
        <div>
          <p className="eyebrow mb-3 text-chocolate">Colour: <span className="normal-case tracking-normal text-espresso">{color}</span></p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { setColor(c); setVariantId(null); }}
                aria-pressed={c === color}
                className={cn("h-10 rounded-sm border px-4 text-sm", c === color ? "border-espresso bg-espresso text-ivory" : "border-chocolate/30 hover:border-espresso")}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow text-chocolate">Size{selected && <span className="normal-case tracking-normal text-espresso">: {selected.size}</span>}</p>
          {sizeChart && sizeChart.rows.length > 0 && (
            <button type="button" onClick={() => setChartOpen(true)} className="flex items-center gap-1.5 text-xs text-chocolate underline underline-offset-4">
              <Ruler size={14} /> Size guide
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
          {options.map((v) => (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={v.id === variantId}
              disabled={v.stock === 0}
              onClick={() => { setVariantId(v.id); setQty(1); }}
              className={cn(
                "relative h-11 min-w-12 rounded-sm border px-3 text-sm transition-colors",
                v.id === variantId ? "border-espresso bg-espresso text-ivory" : "border-chocolate/30 hover:border-espresso",
                v.stock === 0 && "cursor-not-allowed text-chocolate/40 line-through hover:border-chocolate/30",
              )}
            >
              {v.size}
            </button>
          ))}
        </div>
        {selected && selected.stock <= 5 && <p className="mt-2 text-xs text-warning">Only {selected.stock} left in this size</p>}
      </div>

      <div className="flex gap-3">
        <div className="flex h-12 items-center rounded-sm border border-chocolate/30">
          <button type="button" className="px-3 disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Decrease quantity"><Minus size={14} /></button>
          <span className="w-8 text-center text-sm" aria-live="polite">{qty}</span>
          <button type="button" className="px-3 disabled:opacity-30" onClick={() => setQty((q) => Math.min(selected?.stock ?? 10, q + 1, 10))} disabled={!!selected && qty >= selected.stock} aria-label="Increase quantity"><Plus size={14} /></button>
        </div>
        <Button type="button" size="lg" className="flex-1" onClick={() => add(false)} disabled={pending || !options.some((v) => v.stock > 0)}>
          {options.some((v) => v.stock > 0) ? "Add to bag" : "Sold out"}
        </Button>
        <Button type="button" variant="secondary" size="icon" className="h-12 w-12" onClick={wishlist} disabled={pending} aria-label="Save to wishlist">
          <Heart size={18} strokeWidth={1.5} />
        </Button>
      </div>
      <Button type="button" variant="accent" size="lg" className="w-full" onClick={() => add(true)} disabled={pending || !options.some((v) => v.stock > 0)}>
        Buy now
      </Button>

      {chartOpen && sizeChart && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Size guide">
          <div className="absolute inset-0 bg-espresso/50" onClick={() => setChartOpen(false)} />
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-auto rounded-t-md bg-ivory p-6 sm:rounded-md">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="heading-display text-2xl">Size guide</h2>
              <button type="button" onClick={() => setChartOpen(false)} aria-label="Close"><X size={20} /></button>
            </div>
            <p className="mb-4 text-xs text-chocolate">All measurements in {sizeChart.unit === "cm" ? "centimetres" : "inches"}.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-chocolate/20 text-left text-xs uppercase tracking-wider text-chocolate">
                    <th className="py-2 pr-4">Size</th>
                    {sizeChart.columns.map((c) => <th key={c} className="py-2 pr-4">{c}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sizeChart.rows.map((r) => (
                    <tr key={r.size} className="border-b border-chocolate/10">
                      <td className="py-2 pr-4 font-medium">{r.size}</td>
                      {r.values.map((v, i) => <td key={i} className="py-2 pr-4">{v}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
