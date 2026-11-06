"use client";

import { Check } from "lucide-react";
import { useState, useTransition } from "react";
import { updateVariantStock } from "@/app/actions/admin-catalog";
import { toast } from "@/components/toaster";

export function StockEditor({ variantId, stock }: { variantId: string; stock: number }) {
  const [value, setValue] = useState(String(stock));
  const [pending, start] = useTransition();
  const dirty = Number(value) !== stock;

  function save() {
    start(async () => {
      const res = await updateVariantStock(variantId, Number(value));
      if (!res.ok) return toast(res.error, "error");
      toast("Stock updated");
    });
  }

  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        if (dirty) save();
      }}
    >
      <input
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
        inputMode="numeric"
        aria-label="Stock"
        className="h-8 w-20 rounded-sm border border-chocolate/25 bg-ivory px-2 text-sm focus:border-espresso focus:outline-none"
      />
      {dirty && (
        <button type="submit" disabled={pending} className="rounded-sm bg-espresso p-1.5 text-ivory" aria-label="Save stock">
          <Check size={14} />
        </button>
      )}
    </form>
  );
}
