import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ user: vi.fn(), limit: vi.fn(), client: vi.fn(), verify: vi.fn(), receipt: vi.fn(), single: vi.fn(), update: vi.fn(), saved: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/rate-limit", () => ({ enforceForRequest: mocks.limit }));
vi.mock("@/lib/supabase/server", () => ({ getSupabaseServerClient: mocks.client }));
vi.mock("@/lib/mailgun", () => ({ sendPaymentReceipt: mocks.receipt }));
vi.mock("@/lib/paystack", () => ({ toKobo: (amount: number) => Math.round(amount * 100), verifyTransaction: mocks.verify }));
import { verifyOrderPayment } from "@/lib/payment-verification";
const id = "11111111-1111-4111-8111-111111111111";
const row = { id, subtotal: 84, customer_name: "Ada", customer_email: "ada@example.com", created_at: "2026-10-05", payment_status: "pending", order_items: [] };
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: "user_owner" });
  mocks.limit.mockResolvedValue({ limited: false });
  mocks.single.mockResolvedValue({ data: row });
  mocks.saved.mockResolvedValue({ error: null });
  mocks.update.mockReturnValue({ eq: mocks.saved });
  mocks.client.mockResolvedValue({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.single }) }), update: mocks.update }) });
  mocks.verify.mockResolvedValue({ ok: true, reference: id, amountKobo: 8400, paidAt: null });
  mocks.receipt.mockResolvedValue({ sent: true });
});
describe("shared browser and mobile payment verification", () => {
  it("requires authentication before provider or database access", async () => {
    mocks.user.mockResolvedValue(null);
    expect(await verifyOrderPayment(id)).toMatchObject({ paid: "0", payment: "unauthenticated" });
    expect(mocks.client).not.toHaveBeenCalled();
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it("cannot verify an order hidden by owner RLS", async () => {
    mocks.single.mockResolvedValue({ data: null });
    expect(await verifyOrderPayment(id)).toMatchObject({ paid: "0" });
    expect(mocks.verify).not.toHaveBeenCalled();
  });
  it("verifies against the database total in kobo", async () => {
    expect(await verifyOrderPayment(id)).toMatchObject({ paid: "1" });
    expect(mocks.verify).toHaveBeenCalledWith(id, 8400);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ payment_status: "paid", payment_reference: id }));
  });
  it("rejects an amount mismatch", async () => {
    mocks.verify.mockResolvedValue({ ok: false, reason: "amount_mismatch" });
    expect(await verifyOrderPayment(id)).toMatchObject({ paid: "0", payment: "amount_mismatch" });
    expect(mocks.update).not.toHaveBeenCalledWith(expect.objectContaining({ payment_status: "paid" }));
    expect(mocks.receipt).not.toHaveBeenCalled();
  });
  it("does not resend receipts or verify again for an already paid order", async () => {
    mocks.single.mockResolvedValue({ data: { ...row, payment_status: "paid" } });
    expect(await verifyOrderPayment(id)).toMatchObject({ paid: "1" });
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.receipt).not.toHaveBeenCalled();
  });
  it("does not claim success when the database update fails", async () => {
    mocks.saved.mockResolvedValue({ error: { message: "unavailable" } });
    expect(await verifyOrderPayment(id)).toMatchObject({ paid: "0", payment: "save_failed" });
  });
  it("keeps payment successful if receipt delivery fails", async () => {
    mocks.receipt.mockResolvedValue({ sent: false, reason: "network_error" });
    expect(await verifyOrderPayment(id)).toMatchObject({ paid: "1", email: "receipt_failed" });
  });
});
