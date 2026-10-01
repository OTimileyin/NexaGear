import "server-only";

export interface ConfirmationOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  subtotal: number;
  createdAt: string; // ISO timestamp
  items: { name: string; quantity: number; lineTotal: number }[];
}

export interface MailgunResult {
  sent: boolean;
  reason?: "not_configured" | "http_error" | "network_error";
  detail?: string;
}

function money(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/** Pure builder — unit-tested: reference, date, items, quantities, total (PRD §15). */
export function buildConfirmationEmail(order: ConfirmationOrder): {
  subject: string;
  text: string;
} {
  const date = new Date(order.createdAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });

  const lines = order.items.map(
    (item) => `- ${item.name} x ${item.quantity} — ${money(item.lineTotal)}`,
  );

  const subject = `NexaGear order confirmation — ${order.id.slice(0, 8)}`;
  const text = [
    `Hi ${order.customerName},`,
    "",
    "Your NexaGear order was received and saved. Here's what it contains:",
    "",
    `Reference: ${order.id}`,
    `Date: ${date} (UTC)`,
    `Delivery: Free for this demo`,
    "",
    "Items:",
    ...lines,
    "",
    `Subtotal: ${money(order.subtotal)}`,
    `Total: ${money(order.subtotal)}`,
    "",
    "No payment was taken — NexaGear is an internship demo store.",
    "",
    "— NexaGear",
  ].join("\n");

  return { subject, text };
}

/**
 * Sends the confirmation via Mailgun's REST API. Server-only: the API key
 * never reaches the browser. Never throws — email failure must not affect
 * the already-persisted order (PRD §15).
 */
export async function sendOrderConfirmation(
  order: ConfirmationOrder,
): Promise<MailgunResult> {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  const from = process.env.MAILGUN_FROM_EMAIL;

  if (!apiKey || !domain || !from) {
    return { sent: false, reason: "not_configured" };
  }

  const { subject, text } = buildConfirmationEmail(order);

  try {
    const endpoint = `https://api.mailgun.net/v3/${domain}/messages`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        from,
        to: order.customerEmail,
        subject,
        text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[mailgun] send failed (HTTP ${response.status}) for order ${order.id}:`,
        detail.slice(0, 300),
      );
      return { sent: false, reason: "http_error", detail: String(response.status) };
    }

    return { sent: true };
  } catch (error) {
    console.error(
      `[mailgun] network failure for order ${order.id}:`,
      error instanceof Error ? error.message : error,
    );
    return { sent: false, reason: "network_error" };
  }
}
