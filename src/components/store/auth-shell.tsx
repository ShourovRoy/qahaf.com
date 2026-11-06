import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="container-page flex justify-center py-14 sm:py-20">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="heading-display text-4xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-chocolate">{subtitle}</p>}
        </div>
        <div className="rounded-sm border border-chocolate/10 bg-surface p-6 sm:p-8">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-chocolate">{footer}</div>}
      </div>
    </div>
  );
}

export function safeNext(next: string | undefined | null, fallback = "/account") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
