import Image from "next/image";
import Link from "next/link";
import { Badge, Stars } from "@/components/ui/misc";
import { discountPercent, formatPrice, ratingAverage } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import type { ProductCard as Card } from "@/server/catalog";

export function ProductCard({ product, priority }: { product: Card; priority?: boolean }) {
  const off = discountPercent(product);
  const [first, second] = product.images;

  return (
    <article className="group relative">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-ivory-alt">
          <Image
            src={mediaUrl(first)}
            alt={product.alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
          {second && (
            <Image
              src={mediaUrl(second)}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
          )}
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {off > 0 && <Badge>-{off}%</Badge>}
            {product.isNew && <Badge tone="dark">New</Badge>}
          </div>
          {!product.inStock && (
            <div className="absolute inset-x-0 bottom-0 bg-espresso/80 py-2 text-center text-[11px] uppercase tracking-[0.2em] text-ivory">
              Sold out
            </div>
          )}
        </div>
        <div className="mt-3 space-y-1">
          <h3 className="line-clamp-1 text-sm text-espresso">{product.name}</h3>
          <p className="flex items-baseline gap-2 text-sm">
            <span className="font-medium text-espresso">{formatPrice(product.salePrice ?? product.regularPrice)}</span>
            {product.salePrice != null && (
              <span className="text-xs text-chocolate/70 line-through">{formatPrice(product.regularPrice)}</span>
            )}
          </p>
          {product.ratingCount > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-chocolate">
              <Stars value={ratingAverage(product)} size={12} />
              <span>({product.ratingCount})</span>
            </p>
          )}
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products, priorityCount = 0 }: { products: Card[]; priorityCount?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
