import { z } from "zod";
import { sendContactEmail } from "@/lib/email";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.string().trim().email("Enter a valid email address.").max(254),
  subject: z.string().trim().min(1, "Subject is required.").max(160),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters.")
    .max(2000),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid contact request." },
      { status: 400 },
    );
  }

  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Please check the form and try again.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  try {
    await sendContactEmail(parsed.data);
    return Response.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        "app.area": "contact",
        route: "/api/contact",
      },
    });
    return Response.json(
      { error: "Unable to send your message right now." },
      { status: 500 },
    );
  }
}
