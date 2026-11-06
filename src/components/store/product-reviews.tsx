import { Lock } from "lucide-react";
import Image from "next/image";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton, Stars } from "@/components/ui/misc";
import { formatDate } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { getUser } from "@/lib/session";
import { getProductReviews, getRatingBreakdown, getReviewableItems } from "@/server/reviews";
import { ReviewForm } from "./review-form";

type Props = { productId: string; slug: string; avg: number; count: number };

export async function ProductReviews({ productId, slug, avg, count }: Props) {
  const breakdown = await getRatingBreakdown(productId);

  return (
    <div className="grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div>
        <p className="heading-display text-6xl">{count ? avg.toFixed(1) : "–"}</p>
        <Stars value={avg} size={18} className="mt-2" />
        <p className="mt-1 text-sm text-chocolate">{count} {count === 1 ? "review" : "reviews"}</p>
        <ul className="mt-5 space-y-1.5">
          {breakdown.map((b) => (
            <li key={b.rating} className="flex items-center gap-2 text-xs text-chocolate">
              <span className="w-3">{b.rating}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ivory-alt">
                <span className="block h-full bg-tan" style={{ width: count ? `${(b.count / count) * 100}%` : 0 }} />
              </span>
              <span className="w-6 text-right">{b.count}</span>
            </li>
          ))}
        </ul>
      </div>
      <Suspense fallback={<div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-24" /></div>}>
        <ReviewsForViewer productId={productId} slug={slug} count={count} />
      </Suspense>
    </div>
  );
}

async function ReviewsForViewer({ productId, slug, count }: { productId: string; slug: string; count: number }) {
  const user = await getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-sm bg-surface p-8">
        <Lock size={20} className="text-chocolate" strokeWidth={1.5} />
        <p className="heading-display text-2xl">Sign in to read reviews</p>
        <p className="max-w-md text-sm text-chocolate">
          Written reviews and customer photos are visible to QAHAF members.
        </p>
        <ButtonLink href={`/login?next=${encodeURIComponent(`/product/${slug}#reviews`)}`}>Sign in</ButtonLink>
      </div>
    );
  }

  const [{ reviews }, reviewable] = await Promise.all([getProductReviews(productId, 1, 20), getReviewableItems(user.id, productId)]);

  return (
    <div className="space-y-8">
      {reviewable.length > 0 && <ReviewForm items={reviewable.map(({ id, orderNumber, size }) => ({ id, orderNumber, size }))} />}
      {reviews.length === 0 ? (
        <p className="text-sm text-chocolate">{count ? "Reviews are being moderated." : "No reviews yet. Reviews can be written after your order is completed."}</p>
      ) : (
        <ul className="divide-y divide-chocolate/10">
          {reviews.map((r) => (
            <li key={r.id} className="py-6 first:pt-0">
              <div className="flex items-center justify-between gap-4">
                <Stars value={r.rating} />
                <time className="text-xs text-chocolate" dateTime={new Date(r.createdAt).toISOString()}>{formatDate(r.createdAt)}</time>
              </div>
              <p className="mt-2 text-sm font-medium">
                {r.user.name}
                <span className="ml-2 text-xs font-normal text-chocolate">Size {r.orderItem.size} · Verified purchase</span>
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-chocolate">{r.body}</p>
              {r.media.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {r.media.map((m) => (
                    <li key={m.id} className="relative h-24 w-24 overflow-hidden rounded-sm bg-ivory-alt">
                      {m.type === "image" ? (
                        <a href={mediaUrl(m.key)} target="_blank" rel="noopener noreferrer">
                          <Image src={mediaUrl(m.key)} alt="Customer photo" fill sizes="96px" className="object-cover" />
                        </a>
                      ) : (
                        <video src={mediaUrl(m.key)} controls playsInline preload="metadata" className="h-full w-full object-cover" />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
