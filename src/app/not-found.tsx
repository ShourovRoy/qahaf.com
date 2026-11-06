import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <Link href="/" className="font-serif text-3xl tracking-[0.35em]">QAHAF</Link>
      <p className="heading-display mt-6 text-6xl text-chocolate">404</p>
      <h1 className="heading-display text-3xl">This page has moved on</h1>
      <p className="max-w-sm text-sm text-chocolate">The page you&apos;re looking for doesn&apos;t exist or is no longer available.</p>
      <div className="mt-2 flex gap-3">
        <Link href="/" className="rounded-sm bg-espresso px-6 py-3 text-xs uppercase tracking-[0.15em] text-ivory hover:bg-chocolate">Home</Link>
        <Link href="/shop" className="rounded-sm border border-chocolate px-6 py-3 text-xs uppercase tracking-[0.15em] text-chocolate hover:bg-chocolate hover:text-ivory">Shop</Link>
      </div>
    </main>
  );
}
