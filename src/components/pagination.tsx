import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { type SearchParams, withParams } from "@/lib/search-params";

export function Pagination({ base, sp, page, pageCount }: { base: string; sp: SearchParams; page: number; pageCount: number }) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 1,
  );
  const href = (p: number) => withParams(base, sp, { page: p === 1 ? null : p });
  const item = "flex h-9 min-w-9 items-center justify-center rounded-sm px-2 text-sm";

  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={cn(item, "hover:bg-ivory-alt")} aria-label="Previous page"><ChevronLeft size={16} /></Link>
      ) : (
        <span className={cn(item, "opacity-30")}><ChevronLeft size={16} /></span>
      )}
      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-chocolate/50">…</span>}
          <Link
            href={href(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(item, p === page ? "bg-espresso text-ivory" : "text-chocolate hover:bg-ivory-alt")}
          >
            {p}
          </Link>
        </span>
      ))}
      {page < pageCount ? (
        <Link href={href(page + 1)} rel="next" className={cn(item, "hover:bg-ivory-alt")} aria-label="Next page"><ChevronRight size={16} /></Link>
      ) : (
        <span className={cn(item, "opacity-30")}><ChevronRight size={16} /></span>
      )}
    </nav>
  );
}
