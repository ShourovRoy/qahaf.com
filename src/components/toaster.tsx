"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

type Toast = { id: number; message: string; tone: "success" | "error" };

export function toast(message: string, tone: Toast["tone"] = "success") {
  window.dispatchEvent(new CustomEvent("qahaf:toast", { detail: { message, tone } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let id = 0;
    const onToast = (e: Event) => {
      const t = { id: ++id, ...(e as CustomEvent<Omit<Toast, "id">>).detail };
      setToasts((list) => [...list.slice(-2), t]);
      setTimeout(() => setToasts((list) => list.filter((x) => x.id !== t.id)), 3500);
    };
    window.addEventListener("qahaf:toast", onToast);
    return () => window.removeEventListener("qahaf:toast", onToast);
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-4 z-[100] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-2 rounded-sm bg-espresso px-4 py-3 text-sm text-ivory shadow-lg"
        >
          {t.tone === "success" ? <CheckCircle2 size={16} className="text-tan" /> : <XCircle size={16} className="text-tan" />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
