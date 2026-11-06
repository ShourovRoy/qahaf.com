import { Badge } from "@/components/ui/misc";

type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "rejected";

export const ORDER_LABEL: Record<OrderStatus, string> = {
  pending: "Awaiting verification",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  rejected: "Rejected",
};

const ORDER_TONE: Record<OrderStatus, "accent" | "dark" | "outline" | "success" | "danger" | "warning"> = {
  pending: "warning",
  confirmed: "outline",
  processing: "outline",
  shipped: "dark",
  delivered: "success",
  cancelled: "danger",
  rejected: "danger",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={ORDER_TONE[status]}>{ORDER_LABEL[status]}</Badge>;
}

type TxnStatus = "pending" | "succeeded" | "failed" | "cancelled";

export function TxnStatusBadge({ status }: { status: TxnStatus }) {
  const tone = { pending: "warning", succeeded: "success", failed: "danger", cancelled: "outline" } as const;
  const label = { pending: "Pending", succeeded: "Paid", failed: "Failed", cancelled: "Cancelled" };
  return <Badge tone={tone[status]}>{label[status]}</Badge>;
}

type PayStatus = "unpaid" | "pending" | "paid" | "failed" | "refunded" | "partially_refunded";

export function PaymentStatusBadge({ status }: { status: PayStatus }) {
  const tone = { unpaid: "outline", pending: "warning", paid: "success", failed: "danger", refunded: "outline", partially_refunded: "outline" } as const;
  return <Badge tone={tone[status]}>{status.replace("_", " ")}</Badge>;
}

export const PROVIDER_LABEL = { cod: "Cash on delivery", sslcommerz: "SSLCommerz", paystation: "PayStation" } as const;

const STEPS: OrderStatus[] = ["pending", "confirmed", "processing", "shipped", "delivered"];

export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === "cancelled" || status === "rejected") return null;
  const current = STEPS.indexOf(status);
  return (
    <ol className="grid grid-cols-5 gap-1" aria-label="Order progress">
      {STEPS.map((s, i) => (
        <li key={s} className="text-center">
          <span className={`block h-1 rounded-full ${i <= current ? "bg-espresso" : "bg-chocolate/15"}`} />
          <span className={`mt-2 block text-[10px] uppercase tracking-wider sm:text-[11px] ${i <= current ? "text-espresso" : "text-chocolate/50"}`}>
            {s === "pending" ? "Placed" : ORDER_LABEL[s]}
          </span>
        </li>
      ))}
    </ol>
  );
}
