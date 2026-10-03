import { statusLabel, statusTone } from "@/lib/orders";

const TONE_CLASSES: Record<ReturnType<typeof statusTone>, string> = {
  neutral: "border-steel/50 text-ink/80",
  progress: "border-drafting text-ink",
  good: "border-stock text-stock",
  bad: "border-signal text-signal",
};

/**
 * Order status as text plus a coloured rule. The word always carries the
 * meaning — the colour is decoration, never the only signal (WCAG 1.4.1).
 */
export function OrderStatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-block border-l-2 pl-2 font-mono text-xs ${TONE_CLASSES[statusTone(status)]} ${className}`}
    >
      {statusLabel(status)}
    </span>
  );
}