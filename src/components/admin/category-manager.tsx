"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState, useTransition } from "react";
import { deleteCategory, saveCategory } from "@/app/actions/admin-catalog";
import { MediaUploader, type UploadedMedia } from "@/components/media-uploader";
import { toast } from "@/components/toaster";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { slugify } from "@/lib/format";
import { mediaUrl } from "@/lib/media";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  imageKey: string | null;
  sortOrder: number;
  isActive: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  products: number;
};

export function CategoryManager({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [pending, start] = useTransition();
  const [q, setQ] = useState("");

  const topLevel = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);
  const matches = (c: Category) => !q || c.name.toLowerCase().includes(q.toLowerCase());

  function remove(c: Category) {
    if (!confirm(`Delete "${c.name}"? Its ${c.products} products will become uncategorised.`)) return;
    start(async () => {
      await deleteCategory(c.id);
      toast("Category deleted");
    });
  }

  const row = (c: Category, child = false) => (
    <li key={c.id} className={`flex items-center gap-4 px-4 py-3 ${child ? "pl-12" : ""}`}>
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-sm bg-ivory-alt">
        {c.imageKey && <Image src={mediaUrl(c.imageKey)} alt="" fill sizes="40px" className="object-cover" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{c.name} {!c.isActive && <Badge tone="outline" className="ml-2">Hidden</Badge>}</p>
        <p className="text-xs text-chocolate">/category/{c.slug} · {c.products} products · order {c.sortOrder}</p>
      </div>
      <button type="button" className="p-2 text-chocolate hover:text-espresso" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><Pencil size={15} /></button>
      <button type="button" className="p-2 text-danger" disabled={pending} onClick={() => remove(c)} aria-label={`Delete ${c.name}`}><Trash2 size={15} /></button>
    </li>
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div>
        <div className="mb-4 flex gap-2">
          <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories" className="h-10 sm:w-72" aria-label="Search categories" />
          <Button size="sm" className="h-10" onClick={() => setEditing("new")}><Plus size={14} /> New</Button>
        </div>
        <ul className="divide-y divide-chocolate/10 rounded-sm border border-chocolate/15 bg-ivory">
          {categories.length === 0 && <li className="px-4 py-12 text-center text-sm text-chocolate">No categories yet. Create your first one.</li>}
          {topLevel.map((c) => [
            matches(c) || childrenOf(c.id).some(matches) ? row(c) : null,
            ...childrenOf(c.id).filter(matches).map((k) => row(k, true)),
          ])}
          {categories.filter((c) => c.parentId && !categories.some((p) => p.id === c.parentId)).filter(matches).map((c) => row(c))}
        </ul>
      </div>
      {editing && (
        <CategoryEditor
          key={editing === "new" ? "new" : editing.id}
          initial={editing === "new" ? null : editing}
          parents={topLevel.filter((p) => editing === "new" || p.id !== editing.id)}
          onDone={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function CategoryEditor({ initial, parents, onDone }: { initial: Category | null; parents: Category[]; onDone: () => void }) {
  const [pending, start] = useTransition();
  const [f, setF] = useState({
    name: initial?.name ?? "",
    slug: initial?.slug ?? "",
    description: initial?.description ?? "",
    parentId: initial?.parentId ?? "",
    sortOrder: String(initial?.sortOrder ?? 0),
    isActive: initial?.isActive ?? true,
    seoTitle: initial?.seoTitle ?? "",
    seoDescription: initial?.seoDescription ?? "",
  });
  const [image, setImage] = useState<UploadedMedia[]>(initial?.imageKey ? [{ key: initial.imageKey, type: "image" }] : []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await saveCategory({
        id: initial?.id,
        ...f,
        slug: f.slug || slugify(f.name),
        description: f.description || null,
        parentId: f.parentId || null,
        imageKey: image[0]?.key ?? null,
        sortOrder: Number(f.sortOrder) || 0,
        seoTitle: f.seoTitle || null,
        seoDescription: f.seoDescription || null,
      });
      if (!res.ok) return toast(res.error, "error");
      toast("Category saved");
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="h-fit space-y-4 rounded-sm border border-chocolate/15 bg-surface p-5 xl:sticky xl:top-6">
      <h2 className="eyebrow">{initial ? "Edit category" : "New category"}</h2>
      <Field label="Name" htmlFor="c-name">
        <Input id="c-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value, slug: initial ? f.slug : slugify(e.target.value) })} required />
      </Field>
      <Field label="Slug" htmlFor="c-slug">
        <Input id="c-slug" value={f.slug} onChange={(e) => setF({ ...f, slug: slugify(e.target.value) })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Parent" htmlFor="c-parent">
          <Select id="c-parent" value={f.parentId} onChange={(e) => setF({ ...f, parentId: e.target.value })}>
            <option value="">None (top level)</option>
            {parents.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
        </Field>
        <Field label="Menu order" htmlFor="c-order">
          <Input id="c-order" inputMode="numeric" value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: e.target.value.replace(/\D/g, "") })} />
        </Field>
      </div>
      <Field label="Description" htmlFor="c-desc">
        <Textarea id="c-desc" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </Field>
      <div>
        <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-chocolate">Icon / image</p>
        <MediaUploader purpose="category" value={image} onChange={setImage} max={1} />
      </div>
      <Field label="SEO title" htmlFor="c-seo">
        <Input id="c-seo" maxLength={70} value={f.seoTitle} onChange={(e) => setF({ ...f, seoTitle: e.target.value })} />
      </Field>
      <Field label="Meta description" htmlFor="c-seod">
        <Textarea id="c-seod" rows={2} maxLength={170} value={f.seoDescription} onChange={(e) => setF({ ...f, seoDescription: e.target.value })} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} className="accent-espresso" /> Visible in store
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        <Button type="button" variant="ghost" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  );
}
