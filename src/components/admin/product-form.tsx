"use client";

import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteProduct, saveProduct } from "@/app/actions/admin-catalog";
import { MediaUploader, type UploadedMedia } from "@/components/media-uploader";
import { toast } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/form";
import type { SizeChart } from "@/db/schema";
import { discountPercent, formatPrice, slugify } from "@/lib/format";
import type { ProductInput } from "@/lib/product-schema";

type Variant = { id?: string; size: string; color: string | null; sku: string; stock: number };
type Initial = Omit<ProductInput, "media" | "variants"> & { id: string; media: UploadedMedia[]; variants: Variant[] };

const SIZE_PRESETS = {
  Tops: ["S", "M", "L", "XL", "XXL"],
  Waist: ["28", "30", "32", "34", "36", "38"],
  Shoes: ["39", "40", "41", "42", "43", "44"],
  "One size": ["Free Size"],
};

const CHART_PRESETS: Record<string, string[]> = {
  Shirt: ["Chest", "Length", "Shoulder", "Sleeve"],
  Trouser: ["Waist", "Hip", "Length", "Inseam"],
  Panjabi: ["Chest", "Length", "Sleeve"],
};

export function ProductForm({ categories, initial }: { categories: { id: string; name: string; parentId: string | null }[]; initial?: Initial }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [slugTouched, setSlugTouched] = useState(!!initial);

  const [f, setF] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    categoryId: initial?.categoryId ?? "",
    shortDescription: initial?.shortDescription ?? "",
    description: initial?.description ?? "",
    regularPrice: initial?.regularPrice?.toString() ?? "",
    salePrice: initial?.salePrice?.toString() ?? "",
    fabric: initial?.fabric ?? "",
    careInstructions: initial?.careInstructions ?? "",
    status: initial?.status ?? "draft",
    isFeatured: initial?.isFeatured ?? false,
    lowStockThreshold: initial?.lowStockThreshold?.toString() ?? "5",
    seoTitle: initial?.seoTitle ?? "",
    seoDescription: initial?.seoDescription ?? "",
  });
  const [variants, setVariants] = useState<Variant[]>(initial?.variants ?? []);
  const [media, setMedia] = useState<UploadedMedia[]>(initial?.media ?? []);
  const [chart, setChart] = useState<SizeChart | null>(initial?.sizeChart ?? null);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const regular = Number(f.regularPrice) || 0;
  const sale = f.salePrice === "" ? null : Number(f.salePrice);
  const discount = sale != null && regular ? regular - sale : 0;

  const skuBase = (f.slug || slugify(f.name)).toUpperCase().replace(/-/g, "").slice(0, 8) || "QH";

  function addSizes(sizes: string[]) {
    setVariants((vs) => {
      const existing = new Set(vs.map((v) => v.size));
      return [...vs, ...sizes.filter((s) => !existing.has(s)).map((size) => ({ size, color: null, sku: `${skuBase}-${size.replace(/\s/g, "").toUpperCase()}`, stock: 0 }))];
    });
  }

  function updateVariant(i: number, patch: Partial<Variant>) {
    setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  }

  function submit(status?: "draft" | "active") {
    const payload = {
      id: initial?.id,
      ...f,
      status: status ?? f.status,
      slug: f.slug || slugify(f.name),
      categoryId: f.categoryId || null,
      description: f.description || null,
      fabric: f.fabric || null,
      careInstructions: f.careInstructions || null,
      seoTitle: f.seoTitle || null,
      seoDescription: f.seoDescription || null,
      regularPrice: regular,
      salePrice: sale,
      lowStockThreshold: Number(f.lowStockThreshold) || 0,
      sizeChart: chart && chart.columns.length && chart.rows.length ? chart : null,
      variants,
      media,
    };
    start(async () => {
      const res = await saveProduct(payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        return toast(res.error, "error");
      }
      setErrors({});
      if (status) set("status", status);
      toast("Product saved");
      if (!initial) router.replace(`/admin/products/${res.id}`);
      else router.refresh();
    });
  }

  function remove() {
    if (!initial || !confirm("Delete this product? Products with past orders will be archived instead.")) return;
    start(async () => {
      const res = await deleteProduct(initial.id);
      if (!res.ok) return toast(res.error ?? "Delete failed", "error");
      toast(res.archived ? "Product archived (it has past orders)" : "Product deleted");
      router.replace("/admin/products");
    });
  }

  return (
    <form
      className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="space-y-6">
        <Card title="Basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name" htmlFor="name" error={errors.name} className="sm:col-span-2">
              <Input id="name" value={f.name} onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} required />
            </Field>
            <Field label="URL slug" htmlFor="slug" error={errors.slug} hint={`/product/${f.slug || "…"}`}>
              <Input id="slug" value={f.slug} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} required />
            </Field>
            <Field label="Category" htmlFor="category">
              <Select id="category" value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">Uncategorised</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.parentId ? `— ${c.name}` : c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Short description" htmlFor="short" error={errors.shortDescription} hint={`${f.shortDescription.length}/300 · shown near the price`} className="sm:col-span-2">
              <Textarea id="short" rows={2} maxLength={300} value={f.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} required />
            </Field>
            <Field label="Full description" htmlFor="desc" className="sm:col-span-2">
              <Textarea id="desc" rows={6} value={f.description} onChange={(e) => set("description", e.target.value)} />
            </Field>
            <Field label="Fabric" htmlFor="fabric">
              <Input id="fabric" value={f.fabric} onChange={(e) => set("fabric", e.target.value)} placeholder="100% cotton" />
            </Field>
            <Field label="Care instructions" htmlFor="care">
              <Input id="care" value={f.careInstructions} onChange={(e) => set("careInstructions", e.target.value)} placeholder="Machine wash cold" />
            </Field>
          </div>
        </Card>

        <Card title="Pricing">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Regular price (৳)" htmlFor="regular" error={errors.regularPrice}>
              <Input id="regular" inputMode="numeric" value={f.regularPrice} onChange={(e) => set("regularPrice", e.target.value.replace(/\D/g, ""))} required />
            </Field>
            <Field label="Sale price (৳)" htmlFor="sale" error={errors.salePrice} hint="Leave empty if not on sale">
              <Input id="sale" inputMode="numeric" value={f.salePrice} onChange={(e) => set("salePrice", e.target.value.replace(/\D/g, ""))} />
            </Field>
            <Field label="Discount amount (৳)" htmlFor="discount" hint={discount > 0 ? `${discountPercent({ regularPrice: regular, salePrice: sale })}% off` : "Sets the sale price for you"}>
              <Input
                id="discount"
                inputMode="numeric"
                value={discount > 0 ? String(discount) : ""}
                onChange={(e) => {
                  const d = Number(e.target.value.replace(/\D/g, "")) || 0;
                  set("salePrice", d > 0 && regular > d ? String(regular - d) : "");
                }}
              />
            </Field>
          </div>
          {regular > 0 && (
            <p className="mt-3 text-sm text-chocolate">
              Customers pay <span className="font-medium text-espresso">{formatPrice(sale ?? regular)}</span>
              {discount > 0 && <> instead of <span className="line-through">{formatPrice(regular)}</span></>}
            </p>
          )}
        </Card>

        <Card title="Media" description="Images and an optional video. The first image is the cover.">
          <MediaUploader purpose="product" value={media} onChange={setMedia} allowVideo max={15} />
          {errors.media && <p className="mt-2 text-xs text-danger">{errors.media[0]}</p>}
        </Card>

        <Card title="Sizes & stock">
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(SIZE_PRESETS).map(([label, sizes]) => (
              <Button key={label} type="button" size="sm" variant="secondary" onClick={() => addSizes(sizes)}>+ {label}</Button>
            ))}
          </div>
          {variants.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-chocolate">
                  <tr><th className="pb-2 pr-2">Size</th><th className="pb-2 pr-2">Colour</th><th className="pb-2 pr-2">SKU</th><th className="pb-2 pr-2">Stock</th><th /></tr>
                </thead>
                <tbody>
                  {variants.map((v, i) => (
                    <tr key={v.id ?? i}>
                      <td className="py-1 pr-2"><Input aria-label="Size" value={v.size} onChange={(e) => updateVariant(i, { size: e.target.value })} className="h-9" /></td>
                      <td className="py-1 pr-2"><Input aria-label="Colour" value={v.color ?? ""} onChange={(e) => updateVariant(i, { color: e.target.value || null })} placeholder="Optional" className="h-9" /></td>
                      <td className="py-1 pr-2"><Input aria-label="SKU" value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value.toUpperCase() })} className="h-9 font-mono text-xs" /></td>
                      <td className="py-1 pr-2"><Input aria-label="Stock" inputMode="numeric" value={v.stock} onChange={(e) => updateVariant(i, { stock: Number(e.target.value.replace(/\D/g, "")) || 0 })} className="h-9 w-24" /></td>
                      <td className="py-1"><button type="button" onClick={() => setVariants((vs) => vs.filter((_, j) => j !== i))} className="p-2 text-danger" aria-label="Remove size"><Trash2 size={15} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => setVariants((vs) => [...vs, { size: "", color: null, sku: `${skuBase}-${vs.length + 1}`, stock: 0 }])}>
            <Plus size={14} /> Add row
          </Button>
          {errors.variants && <p className="mt-2 text-xs text-danger">{errors.variants[0]}</p>}
          <p className="mt-2 text-xs text-chocolate">Total stock: {variants.reduce((s, v) => s + v.stock, 0)}</p>
        </Card>

        <Card title="Measurements (size chart)" description="Shown to customers as a size guide.">
          {!chart ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(CHART_PRESETS).map(([label, cols]) => (
                <Button key={label} type="button" size="sm" variant="secondary" onClick={() => setChart({ unit: "inch", columns: cols, rows: (variants.length ? variants.map((v) => v.size) : ["M"]).filter((s, i, a) => a.indexOf(s) === i).map((size) => ({ size, values: cols.map(() => "") })) })}>
                  {label} template
                </Button>
              ))}
            </div>
          ) : (
            <SizeChartEditor chart={chart} onChange={setChart} />
          )}
        </Card>

        <Card title="Search engine listing">
          <div className="grid gap-4">
            <Field label="SEO title" htmlFor="seo-title" hint={`${f.seoTitle.length}/70 · defaults to product name`}>
              <Input id="seo-title" maxLength={70} value={f.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} />
            </Field>
            <Field label="Meta description" htmlFor="seo-desc" hint={`${f.seoDescription.length}/170 · defaults to short description`}>
              <Textarea id="seo-desc" rows={2} maxLength={170} value={f.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} />
            </Field>
          </div>
        </Card>
      </div>

      <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <Card title="Publish">
          <Field label="Status" htmlFor="status">
            <Select id="status" value={f.status} onChange={(e) => set("status", e.target.value as typeof f.status)}>
              <option value="draft">Draft (hidden)</option>
              <option value="active">Active (visible in store)</option>
              <option value="archived">Archived</option>
            </Select>
          </Field>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={f.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} className="accent-espresso" /> Feature on homepage
          </label>
          <Field label="Low stock alert at" htmlFor="low" hint="Alert when any size has this many or fewer" className="mt-4">
            <Input id="low" inputMode="numeric" value={f.lowStockThreshold} onChange={(e) => set("lowStockThreshold", e.target.value.replace(/\D/g, ""))} />
          </Field>
          <div className="mt-6 flex flex-col gap-2">
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
            {f.status !== "active" && <Button type="button" variant="accent" disabled={pending} onClick={() => submit("active")}>Save &amp; publish</Button>}
            {initial && <Button type="button" variant="ghost" className="text-danger" disabled={pending} onClick={remove}><Trash2 size={14} /> Delete</Button>}
          </div>
        </Card>
      </aside>
    </form>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-chocolate/15 bg-ivory p-5">
      <h2 className="eyebrow">{title}</h2>
      {description && <p className="mt-1 text-xs text-chocolate">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function SizeChartEditor({ chart, onChange }: { chart: SizeChart; onChange: (c: SizeChart | null) => void }) {
  const setCell = (r: number, c: number, v: string) =>
    onChange({ ...chart, rows: chart.rows.map((row, i) => (i === r ? { ...row, values: row.values.map((x, j) => (j === c ? v : x)) } : row)) });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Label className="mb-0">Unit</Label>
        <Select value={chart.unit} onChange={(e) => onChange({ ...chart, unit: e.target.value as "inch" | "cm" })} className="h-9 w-28">
          <option value="inch">Inches</option>
          <option value="cm">Centimetres</option>
        </Select>
        <button type="button" className="ml-auto text-xs text-danger underline" onClick={() => onChange(null)}>Remove chart</button>
      </div>
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr>
              <th className="pb-2 pr-2 text-left text-xs uppercase text-chocolate">Size</th>
              {chart.columns.map((c, j) => (
                <th key={j} className="pb-2 pr-2">
                  <div className="flex items-center gap-1">
                    <Input aria-label="Column name" value={c} onChange={(e) => onChange({ ...chart, columns: chart.columns.map((x, k) => (k === j ? e.target.value : x)) })} className="h-8 w-24 text-xs" />
                    <button type="button" aria-label="Remove column" className="text-danger" onClick={() => onChange({ ...chart, columns: chart.columns.filter((_, k) => k !== j), rows: chart.rows.map((r) => ({ ...r, values: r.values.filter((_, k) => k !== j) })) })}><Trash2 size={12} /></button>
                  </div>
                </th>
              ))}
              <th>
                <button type="button" className="text-xs underline" onClick={() => onChange({ ...chart, columns: [...chart.columns, "New"], rows: chart.rows.map((r) => ({ ...r, values: [...r.values, ""] })) })}>+ column</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row, r) => (
              <tr key={r}>
                <td className="py-1 pr-2"><Input aria-label="Size" value={row.size} onChange={(e) => onChange({ ...chart, rows: chart.rows.map((x, i) => (i === r ? { ...x, size: e.target.value } : x)) })} className="h-8 w-20 text-xs" /></td>
                {row.values.map((v, c) => (
                  <td key={c} className="py-1 pr-2"><Input aria-label={`${chart.columns[c]} for ${row.size}`} value={v} onChange={(e) => setCell(r, c, e.target.value)} className="h-8 w-24 text-xs" /></td>
                ))}
                <td><button type="button" aria-label="Remove row" className="p-1 text-danger" onClick={() => onChange({ ...chart, rows: chart.rows.filter((_, i) => i !== r) })}><Trash2 size={12} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" className="text-xs underline" onClick={() => onChange({ ...chart, rows: [...chart.rows, { size: "", values: chart.columns.map(() => "") }] })}>+ row</button>
    </div>
  );
}
