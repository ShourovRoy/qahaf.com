"use client";

import { ArrowDown, ArrowUp, ImagePlus, Loader2, Play, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { requestUpload } from "@/app/actions/upload";
import { toast } from "@/components/toaster";
import { mediaUrl } from "@/lib/media";

export type UploadedMedia = { key: string; type: "image" | "video"; alt?: string | null };

const ACCEPT = {
  image: "image/jpeg,image/png,image/webp,image/avif",
  both: "image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm,video/quicktime",
};

async function putFile(url: string, file: File, onProgress: (p: number) => void) {
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Upload failed. Check the R2 bucket CORS settings."));
    xhr.send(file);
  });
}

export function MediaUploader({
  purpose,
  value,
  onChange,
  allowVideo = false,
  max = 10,
  name,
}: {
  purpose: "product" | "category" | "site" | "review";
  value: UploadedMedia[];
  onChange: (next: UploadedMedia[]) => void;
  allowVideo?: boolean;
  max?: number;
  // When set, keeps a hidden JSON input in sync for plain form posts.
  name?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<{ name: string; progress: number }[]>([]);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, Math.max(0, max - value.length));
    if (!list.length) return toast(`You can add up to ${max} files`, "error");

    const added: UploadedMedia[] = [];
    for (const file of list) {
      setUploading((u) => [...u, { name: file.name, progress: 0 }]);
      try {
        const ticket = await requestUpload({ purpose, contentType: file.type, size: file.size });
        if (!ticket.ok) throw new Error(ticket.error);
        if (ticket.kind === "video" && !allowVideo) throw new Error("Videos aren't allowed here.");
        await putFile(ticket.url, file, (progress) =>
          setUploading((u) => u.map((x) => (x.name === file.name ? { ...x, progress } : x))),
        );
        added.push({ key: ticket.key, type: ticket.kind });
      } catch (err) {
        toast(`${file.name}: ${err instanceof Error ? err.message : "failed"}`, "error");
      } finally {
        setUploading((u) => u.filter((x) => x.name !== file.name));
      }
    }
    if (added.length) onChange([...value, ...added]);
    if (input.current) input.current.value = "";
  }

  function move(i: number, dir: -1 | 1) {
    const next = [...value];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  }

  return (
    <div>
      {name && <input type="hidden" name={name} value={JSON.stringify(value)} />}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {value.map((m, i) => (
          <div key={m.key} className="group relative aspect-square overflow-hidden rounded-sm border border-chocolate/15 bg-ivory-alt">
            {m.type === "image" ? (
              <Image src={mediaUrl(m.key)} alt="" fill sizes="160px" className="object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-1 bg-espresso text-ivory">
                <Play size={20} />
                <span className="text-[10px] uppercase tracking-wider">Video</span>
              </div>
            )}
            {i === 0 && <span className="absolute left-1 top-1 rounded-sm bg-tan px-1.5 py-0.5 text-[10px] uppercase text-espresso">Cover</span>}
            <div className="absolute inset-x-1 bottom-1 flex justify-between opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
              <span className="flex gap-1">
                {i > 0 && <button type="button" onClick={() => move(i, -1)} className="rounded-sm bg-ivory/90 p-1" aria-label="Move earlier"><ArrowUp size={12} /></button>}
                {i < value.length - 1 && <button type="button" onClick={() => move(i, 1)} className="rounded-sm bg-ivory/90 p-1" aria-label="Move later"><ArrowDown size={12} /></button>}
              </span>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="rounded-sm bg-ivory/90 p-1 text-danger" aria-label="Remove">
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
        {uploading.map((u) => (
          <div key={u.name} className="flex aspect-square flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-chocolate/30 text-xs text-chocolate">
            <Loader2 size={18} className="animate-spin" />
            {u.progress}%
          </div>
        ))}
        {value.length + uploading.length < max && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-chocolate/30 text-xs text-chocolate hover:border-espresso hover:text-espresso"
          >
            <ImagePlus size={20} strokeWidth={1.5} />
            Add {allowVideo ? "media" : "image"}
          </button>
        )}
      </div>
      <input ref={input} type="file" multiple accept={allowVideo ? ACCEPT.both : ACCEPT.image} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      <p className="mt-2 text-xs text-chocolate/70">Images up to 10 MB{allowVideo ? ", videos up to 100 MB" : ""}.</p>
    </div>
  );
}
