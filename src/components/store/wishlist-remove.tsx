"use client";

import { useTransition } from "react";
import { toggleWishlist } from "@/app/actions/cart";
import { toast } from "@/components/toaster";

export function WishlistRemove({ productId }: { productId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => {
        const res = await toggleWishlist(productId);
        if (!res.ok) toast(res.error, "error");
      })}
      className="mt-2 text-xs uppercase tracking-wider text-chocolate underline underline-offset-4"
    >
      Remove
    </button>
  );
}
