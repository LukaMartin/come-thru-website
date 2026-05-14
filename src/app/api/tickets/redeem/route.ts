import { z } from "zod";
import { isScannerAuthenticated } from "@/lib/scanner-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { hashTicketSecret, parseTicketQr } from "@/lib/tickets";

export const dynamic = "force-dynamic";

const redeemSchema = z.object({
  qr: z.string().min(1),
  eventId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  if (!(await isScannerAuthenticated())) {
    return Response.json({ error: "Scanner is locked." }, { status: 401 });
  }

  const parsed = redeemSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: "Invalid redemption request." }, { status: 400 });
  }

  const ticket = parseTicketQr(parsed.data.qr);

  if (!ticket) {
    return Response.json({ result: "invalid" }, { status: 200 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("ticketing_redeem_ticket", {
    p_ticket_code: ticket.code,
    p_secret_hash: hashTicketSecret(ticket.secret),
    p_event_id: parsed.data.eventId ?? null,
    p_scanned_by: null,
  });

  if (error) {
    throw error;
  }

  return Response.json(data?.[0] ?? { result: "invalid" });
}
