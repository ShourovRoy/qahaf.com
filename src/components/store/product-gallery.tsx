"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { mediaUrl } from "@/lib/media";

type Media = { id: string; type: "image" | "video"; key: string; alt: string | null };

export function ProductGallery({ media, name }: { media: Media[]; name: string }) {
  const [active, setActive] = useState(0);
  const items = media.length ? media : [{ id: "placeholder", type: "image" as const, key: "", alt: name }];
  const current = items[Math.min(active, items.length - 1)];

  return (
    <div className="flex flex-col-reverse gap-3 lg:flex-row">
      {items.length > 1 && (
        <ul className="no-scrollbar flex gap-2 overflow-x-auto lg:max-h-[640px] lg:w-20 lg:flex-col lg:overflow-y-auto" aria-label="Product media">
          {items.map((m, i) => (
            <li key={m.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show ${m.type} ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "relative block aspect-[4/5] w-16 overflow-hidden rounded-sm border bg-ivory-alt lg:w-20",
                  i === active ? "border-espresso" : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                {m.type === "image" ? (
                  <Image src={mediaUrl(m.key)} alt="" fill sizes="80px" className="object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center bg-espresso text-ivory"><Play size={18} /></span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative aspect-[4/5] flex-1 overflow-hidden rounded-sm bg-ivory-alt">
        {current.type === "image" ? (
          <Image
            key={current.id}
            src={mediaUrl(current.key)}
            alt={current.alt ?? name}
            fill
            priority={active === 0}
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <video key={current.id} src={mediaUrl(current.key)} controls playsInline className="h-full w-full object-cover" aria-label={`${name} video`} />
        )}
      </div>
    </div>
  );
}
