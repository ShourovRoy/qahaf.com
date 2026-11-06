"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="heading-display text-3xl">Something went wrong</h1>
      <p className="max-w-sm text-sm text-chocolate">Please try again. If the problem continues, contact us.</p>
      <button type="button" onClick={reset} className="rounded-sm bg-espresso px-6 py-3 text-xs uppercase tracking-[0.15em] text-ivory hover:bg-chocolate">
        Try again
      </button>
    </main>
  );
}
