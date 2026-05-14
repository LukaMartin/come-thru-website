import { z } from "zod";
import { isValidScannerPin, setScannerAuthCookie } from "@/lib/scanner-auth";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  pin: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  const parsed = loginSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json({ error: "Enter a 6-digit PIN." }, { status: 400 });
  }

  if (!isValidScannerPin(parsed.data.pin)) {
    return Response.json({ error: "Wrong PIN." }, { status: 401 });
  }

  await setScannerAuthCookie();

  return Response.json({ ok: true });
}
