import * as Sentry from "@sentry/nextjs";

export const MIN_QUANTITY_PER_TRANSACTION = 1;
export const MAX_QUANTITY_PER_TRANSACTION = 10;

export type TicketOption = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  capacity: number;
  sold: number;
  sales_start_at: string | null;
  sales_end_at: string | null;
};

export type CheckoutExitReason = "expired" | "unavailable";

export async function cancelCheckoutReservationClient(orderId: string) {
  try {
    const response = await fetch(`/api/checkout/expire`, {
      cache: "no-store",
      method: "POST",
      body: JSON.stringify({ orderId }),
    });

    if (!response.ok) {
      throw new Error("Failed to cancel checkout reservation");
    }

    const payload = (await response.json()) as {
      cancelled: boolean;
    };

    return payload.cancelled;
  } catch (error) {
    Sentry.captureException(error);
  }
}
