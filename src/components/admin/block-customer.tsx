"use client";

import { useTransition } from "react";
import { setCustomerBlocked } from "@/app/actions/admin-misc";
import { toast } from "@/components/toaster";
import { Button } from "@/components/ui/button";

export function BlockCustomerButton({ userId, blocked }: { userId: string; blocked: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant={blocked ? "secondary" : "danger"}
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!blocked && !confirm("Block this customer? They will be signed out and unable to sign in.")) return;
        start(async () => {
          const res = await setCustomerBlocked(userId, !blocked);
          if (!res.ok) return toast(res.error, "error");
          toast(blocked ? "Customer unblocked" : "Customer blocked");
        });
      }}
    >
      {blocked ? "Unblock" : "Block customer"}
    </Button>
  );
}
