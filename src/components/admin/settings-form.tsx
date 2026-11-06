"use client";

import { useState, useTransition } from "react";
import { saveSettings } from "@/app/actions/admin-misc";
import { MediaUploader, type UploadedMedia } from "@/components/media-uploader";
import { toast } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { mediaUrl } from "@/lib/media";
import type { StoreSettings } from "@/server/settings";

export function SettingsForm({ initial }: { initial: StoreSettings }) {
  const [s, setS] = useState(initial);
  const [heroImage, setHeroImage] = useState<UploadedMedia[]>(initial.hero.imageKey ? [{ key: initial.hero.imageKey, type: "image" }] : []);
  const [marquee, setMarquee] = useState(initial.marquee.join("\n"));
  const [pending, start] = useTransition();

  const num = (v: string) => Number(v.replace(/\D/g, "")) || 0;
  const hero = <K extends keyof StoreSettings["hero"]>(k: K, v: string) => setS({ ...s, hero: { ...s.hero, [k]: v } });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await saveSettings({
        ...s,
        hero: { ...s.hero, imageKey: heroImage[0]?.key ?? "", stats: s.hero.stats.filter((x) => x.value.trim()) },
        marquee: marquee.split("\n").map((t) => t.trim()).filter(Boolean),
      });
      if (!res.ok) return toast(res.error, "error");
      toast("Settings saved");
    });
  }

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-6">
      <Card title="Delivery charges">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Inside Dhaka (৳)" htmlFor="s-in">
            <Input id="s-in" inputMode="numeric" value={s.shippingInsideDhaka} onChange={(e) => setS({ ...s, shippingInsideDhaka: num(e.target.value) })} />
          </Field>
          <Field label="Outside Dhaka (৳)" htmlFor="s-out">
            <Input id="s-out" inputMode="numeric" value={s.shippingOutsideDhaka} onChange={(e) => setS({ ...s, shippingOutsideDhaka: num(e.target.value) })} />
          </Field>
          <Field label="Free delivery over (৳)" htmlFor="s-free" hint="0 turns this off">
            <Input id="s-free" inputMode="numeric" value={s.freeShippingThreshold} onChange={(e) => setS({ ...s, freeShippingThreshold: num(e.target.value) })} />
          </Field>
        </div>
      </Card>

      <Card title="Homepage banner">
        <HeroPreview hero={{ ...s.hero, imageKey: heroImage[0]?.key ?? "" }} />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Kicker" htmlFor="h-kicker" hint="Small line above the title, e.g. SPECIAL OFFER">
            <Input id="h-kicker" maxLength={40} value={s.hero.kicker} onChange={(e) => hero("kicker", e.target.value)} />
          </Field>
          <Field label="Highlight" htmlFor="h-hl" hint="Large accent text before the title, e.g. 50%">
            <Input id="h-hl" maxLength={20} value={s.hero.highlight} onChange={(e) => hero("highlight", e.target.value)} />
          </Field>
          <Field label="Title" htmlFor="h-title" className="sm:col-span-2">
            <Input id="h-title" maxLength={60} value={s.hero.title} onChange={(e) => hero("title", e.target.value)} />
          </Field>
          <Field label="Subtitle" htmlFor="h-sub" className="sm:col-span-2">
            <Textarea id="h-sub" rows={2} maxLength={160} value={s.hero.subtitle} onChange={(e) => hero("subtitle", e.target.value)} />
          </Field>
          <Field label="Main button label" htmlFor="h-cta" hint="Leave empty to hide">
            <Input id="h-cta" maxLength={30} value={s.hero.ctaLabel} onChange={(e) => hero("ctaLabel", e.target.value)} />
          </Field>
          <Field label="Main button link" htmlFor="h-href" hint="e.g. /shop?sale=1">
            <Input id="h-href" value={s.hero.ctaHref} onChange={(e) => hero("ctaHref", e.target.value)} />
          </Field>
          <Field label="Second button label" htmlFor="h-cta2" hint="Leave empty to hide">
            <Input id="h-cta2" maxLength={30} value={s.hero.secondaryLabel} onChange={(e) => hero("secondaryLabel", e.target.value)} />
          </Field>
          <Field label="Second button link" htmlFor="h-href2" hint="e.g. /category/panjabi">
            <Input id="h-href2" value={s.hero.secondaryHref} onChange={(e) => hero("secondaryHref", e.target.value)} />
          </Field>

          <div className="sm:col-span-2">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-chocolate">Stats under the buttons</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((i) => {
                const stat = s.hero.stats[i] ?? { value: "", label: "" };
                const setStat = (patch: Partial<typeof stat>) => {
                  const stats = [0, 1, 2].map((j) => s.hero.stats[j] ?? { value: "", label: "" });
                  stats[i] = { ...stat, ...patch };
                  setS({ ...s, hero: { ...s.hero, stats } });
                };
                return (
                  <div key={i} className="flex gap-2">
                    <Input aria-label={`Stat ${i + 1} value`} placeholder="64" maxLength={10} className="w-20" value={stat.value} onChange={(e) => setStat({ value: e.target.value })} />
                    <Input aria-label={`Stat ${i + 1} label`} placeholder="Districts" maxLength={24} value={stat.label} onChange={(e) => setStat({ label: e.target.value })} />
                  </div>
                );
              })}
            </div>
            <p className="mt-1.5 text-xs text-chocolate">Clear a value to hide that stat. Clear all to hide the row.</p>
          </div>

          <div className="sm:col-span-2">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-chocolate">Banner image</p>
            <MediaUploader purpose="site" value={heroImage} onChange={setHeroImage} max={1} />
          </div>
          <Field label="Image description" htmlFor="h-alt" hint="Read by screen readers and search engines">
            <Input id="h-alt" maxLength={120} value={s.hero.imageAlt} onChange={(e) => hero("imageAlt", e.target.value)} />
          </Field>
          <Field label="Rotating badge text" htmlFor="h-badge" hint="Leave empty to hide the badge">
            <Input id="h-badge" maxLength={40} value={s.hero.badgeText} onChange={(e) => hero("badgeText", e.target.value)} />
          </Field>
          <Field label="Scrolling strip" htmlFor="h-marquee" hint="One phrase per line. Leave empty to hide the strip." className="sm:col-span-2">
            <Textarea
              id="h-marquee"
              rows={4}
              value={marquee}
              onChange={(e) => setMarquee(e.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card title="Store details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Announcement bar" htmlFor="s-ann" hint="Leave empty to hide" className="sm:col-span-2">
            <Input id="s-ann" maxLength={160} value={s.announcement} onChange={(e) => setS({ ...s, announcement: e.target.value })} />
          </Field>
          <Field label="Contact phone" htmlFor="s-phone">
            <Input id="s-phone" value={s.contactPhone} onChange={(e) => setS({ ...s, contactPhone: e.target.value })} />
          </Field>
          <Field label="Contact email" htmlFor="s-email">
            <Input id="s-email" type="email" value={s.contactEmail} onChange={(e) => setS({ ...s, contactEmail: e.target.value })} />
          </Field>
          <Field
            label="Order alert email"
            htmlFor="s-notify"
            hint="Gets new-order and low-stock emails. Not shown on the site. Empty uses the contact email."
            className="sm:col-span-2"
          >
            <Input id="s-notify" type="email" value={s.notifyEmail} onChange={(e) => setS({ ...s, notifyEmail: e.target.value })} />
          </Field>
          <Field label="Address" htmlFor="s-addr" className="sm:col-span-2">
            <Textarea id="s-addr" rows={2} value={s.storeAddress} onChange={(e) => setS({ ...s, storeAddress: e.target.value })} />
          </Field>
          {(["facebook", "instagram", "tiktok"] as const).map((k) => (
            <Field key={k} label={k} htmlFor={`so-${k}`}>
              <Input id={`so-${k}`} type="url" placeholder="https://" value={s.socials[k]} onChange={(e) => setS({ ...s, socials: { ...s.socials, [k]: e.target.value } })} />
            </Field>
          ))}
        </div>
      </Card>

      <Button type="submit" size="lg" disabled={pending}>{pending ? "Saving…" : "Save settings"}</Button>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-chocolate/15 bg-ivory p-5">
      <h2 className="eyebrow mb-4">{title}</h2>
      {children}
    </section>
  );
}

function HeroPreview({ hero }: { hero: StoreSettings["hero"] }) {
  const stats = hero.stats.filter((x) => x.value.trim());
  return (
    <div className="overflow-hidden rounded-sm border border-chocolate/15 bg-ivory">
      <p className="border-b border-chocolate/10 bg-surface px-3 py-1.5 text-[11px] uppercase tracking-wider text-chocolate">Preview</p>
      <div className="grid items-center gap-5 p-5 sm:grid-cols-2">
        <div>
          {hero.kicker && (
            <p className="eyebrow flex items-center gap-2 text-[10px] text-chocolate">
              <span aria-hidden className="h-px w-6 bg-tan" />
              {hero.kicker}
            </p>
          )}
          <p className="heading-display mt-2 text-3xl text-espresso">
            {hero.highlight && <span className="block text-5xl text-tan">{hero.highlight}</span>}
            {hero.title || "Title"}
          </p>
          {hero.subtitle && <p className="mt-2 line-clamp-3 text-xs text-chocolate">{hero.subtitle}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {hero.ctaLabel && <span className="rounded-sm bg-espresso px-3 py-1.5 text-[10px] uppercase tracking-wider text-ivory">{hero.ctaLabel}</span>}
            {hero.secondaryLabel && <span className="rounded-sm border border-espresso px-3 py-1.5 text-[10px] uppercase tracking-wider">{hero.secondaryLabel}</span>}
          </div>
          {stats.length > 0 && (
            <div className="mt-3 flex gap-4 border-t border-chocolate/15 pt-2">
              {stats.map((x, i) => (
                <p key={i} className="text-center">
                  <span className="block font-serif text-lg leading-none">{x.value}</span>
                  <span className="text-[9px] uppercase tracking-wider text-chocolate">{x.label}</span>
                </p>
              ))}
            </div>
          )}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- small admin preview */}
        <img src={mediaUrl(hero.imageKey)} alt="" className="aspect-[4/3] w-full rounded-sm bg-tan object-cover" />
      </div>
    </div>
  );
}
