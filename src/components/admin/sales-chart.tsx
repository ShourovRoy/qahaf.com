import { formatPrice } from "@/lib/format";

type Day = { day: string; total: number; orders: number };

const label = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// Single series, so no legend: the section title names it.
export function SalesChart({ days }: { days: Day[] }) {
  const max = Math.max(...days.map((d) => d.total), 1);

  return (
    <figure>
      <div className="relative flex h-48 items-end gap-[2px] border-b border-chocolate/20" aria-hidden>
        {[0.5, 1].map((f) => (
          <span key={f} className="pointer-events-none absolute inset-x-0 border-t border-dashed border-chocolate/10" style={{ bottom: `${f * 100}%` }} />
        ))}
        {days.map((d) => (
          <div key={d.day} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-[4px] bg-chocolate transition-colors group-hover:bg-espresso"
              style={{ height: d.total ? `max(2px, ${(d.total / max) * 100}%)` : 0 }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-sm bg-espresso px-2 py-1 text-xs text-ivory group-hover:block">
              {label(d.day)} · {formatPrice(d.total)} · {d.orders} orders
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-chocolate">
        <span>{label(days[0].day)}</span>
        <span>Peak {formatPrice(max)}</span>
        <span>{label(days[days.length - 1].day)}</span>
      </div>
      <table className="sr-only">
        <caption>Daily sales, last 30 days</caption>
        <thead><tr><th>Date</th><th>Sales</th><th>Orders</th></tr></thead>
        <tbody>
          {days.map((d) => <tr key={d.day}><td>{d.day}</td><td>{formatPrice(d.total)}</td><td>{d.orders}</td></tr>)}
        </tbody>
      </table>
    </figure>
  );
}
