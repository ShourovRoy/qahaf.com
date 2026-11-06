"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cancelMyOrder } from "@/app/actions/checkout";
import { toast } from "@/components/toaster";
import { Button } from "@/components/ui/button";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Cancel this order?")) return;
        start(async () => {
          const res = await cancelMyOrder(orderId);
          if (!res.ok) return toast(res.error, "error");
          toast("Order cancelled");
          router.refresh();
        });
      }}
    >
      {pending ? "Cancelling…" : "Cancel order"}
    </Button>
  );
}
