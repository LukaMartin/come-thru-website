export const MIN_QUANTITY_PER_TRANSACTION = 1;
export const MAX_QUANTITY_PER_TRANSACTION = 20;

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
