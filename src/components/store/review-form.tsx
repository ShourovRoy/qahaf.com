"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createReview } from "@/app/actions/reviews";
import { MediaUploader, type UploadedMedia } from "@/components/media-uploader";
import { toast } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/form";
import { cn } from "@/lib/cn";

export function ReviewForm({ items }: { items: { id: string; orderNumber: string; size: string }[] }) {
  const router = useRouter();
  const [itemId, setItemId] = useState(items[0].id);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) return setError("Please choose a star rating.");
    start(async () => {
      const res = await createReview({ orderItemId: itemId, rating, body, media: media.map(({ key, type }) => ({ key, type })) });
      if (!res.ok) return setError(res.error);
      toast("Thank you for your review");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-sm border border-chocolate/15 bg-surface p-6">
      <p className="heading-display text-2xl">Write a review</p>
      {items.length > 1 && (
        <Field label="Purchase" htmlFor="rv-item">
          <Select id="rv-item" value={itemId} onChange={(e) => setItemId(e.target.value)}>
            {items.map((i) => <option key={i.id} value={i.id}>Order {i.orderNumber} · Size {i.size}</option>)}
          </Select>
        </Field>
      )}
      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-chocolate">Rating</p>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => setRating(n)} onMouseEnter={() => setHover(n)}>
              <Star size={26} strokeWidth={1.25} className={cn((hover || rating) >= n ? "fill-tan text-tan" : "text-chocolate/40")} />
            </button>
          ))}
        </div>
      </div>
      <Field label="Your review" htmlFor="rv-body">
        <Textarea id="rv-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={1500} placeholder="How was the fit, fabric and quality?" required />
      </Field>
      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-chocolate">Photos &amp; short videos (optional)</p>
        <MediaUploader purpose="review" value={media} onChange={setMedia} allowVideo max={6} />
      </div>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Submitting…" : "Submit review"}</Button>
    </form>
  );
}
