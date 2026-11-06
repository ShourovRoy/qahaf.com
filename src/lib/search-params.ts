export type SearchParams = Record<string, string | string[] | undefined>;

export function param(sp: SearchParams, key: string) {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
}

export function intParam(sp: SearchParams, key: string) {
  const n = Number(param(sp, key));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined;
}

export function withParams(base: string, sp: SearchParams, changes: Record<string, string | number | undefined | null>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = Array.isArray(v) ? v[0] : v;
    if (val) q.set(k, val);
  }
  for (const [k, v] of Object.entries(changes)) {
    if (v == null || v === "") q.delete(k);
    else q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `${base}?${s}` : base;
}
