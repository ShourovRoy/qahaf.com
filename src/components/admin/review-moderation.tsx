"use client";

import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { deleteReview, setReviewHidden } from "@/app/actions/admin-misc";
import { toast } from "@/components/toaster";

export function ReviewModeration({ reviewId, hidden }: { reviewId: string; hidden: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => { await setReviewHidden(reviewId, !hidden); toast(hidden ? "Review visible" : "Review hidden"); })}
        className="p-2 text-chocolate hover:text-espresso"
        aria-label={hidden ? "Show review" : "Hide review"}
      >
        {hidden ? <Eye size={15} /> : <EyeOff size={15} />}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => confirm("Delete this review permanently?") && start(async () => { await deleteReview(reviewId); toast("Review deleted"); })}
        className="p-2 text-danger"
        aria-label="Delete review"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
