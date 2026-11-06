"use client";

import { Minus, Plus } from "lucide-react";
import { useTransition } from "react";
import { updateCartItem } from "@/app/actions/cart";
import { toast } from "@/components/toaster";

export function CartQuantity({ itemId, quantity, max }: { itemId: string; quantity: number; max: number }) {
  const [pending, start] = useTransition();

  const set = (q: number) =>
    start(async () => {
      const res = await updateCartItem(itemId, q);
      if (!res.ok) toast(res.error, "error");
    });

  return (
    <div className="flex items-center justify-between">
      <div className="flex h-9 items-center rounded-sm border border-chocolate/30" aria-busy={pending}>
        <button type="button" className="px-2.5 disabled:opacity-30" onClick={() => set(quantity - 1)} disabled={pending || quantity <= 1} aria-label="Decrease quantity"><Minus size={12} /></button>
        <span className="w-7 text-center text-sm">{quantity}</span>
        <button type="button" className="px-2.5 disabled:opacity-30" onClick={() => set(quantity + 1)} disabled={pending || quantity >= max} aria-label="Increase quantity"><Plus size={12} /></button>
      </div>
      <button type="button" onClick={() => set(0)} disabled={pending} className="text-xs uppercase tracking-wider text-chocolate underline-offset-4 hover:underline">
        Remove
      </button>
    </div>
  );
}
