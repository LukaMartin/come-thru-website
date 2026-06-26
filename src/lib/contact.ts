"use server";

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { createSupportThreadWithMessage } from "@/lib/support-server";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
  email: z.email("Enter a valid email address.").max(254),
  subject: z.string().trim().min(1, "Subject is required.").max(160),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters.")
    .max(2000),
});

export type ContactFormState = {
  status?: "success" | "error";
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof contactSchema>, string[]>>;
  values?: {
    name: string;
    email: string;
    subject: string;
    message: string;
  };
};

export async function handleContactFormSubmission(
  _state: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    subject: String(formData.get("subject") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  const parsed = contactSchema.safeParse(values);

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;

    return {
      status: "error",
      error:
        Object.values(fieldErrors).flat()[0] ??
        "Please check the form and try again.",
      fieldErrors,
      values,
    };
  }

  try {
    await createSupportThreadWithMessage({
      customerEmail: parsed.data.email,
      customerName: parsed.data.name,
      subject: parsed.data.subject,
      bodyText: parsed.data.message,
      source: "contact_form",
      provider: "contact_form",
    });

    return { status: "success" };
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        "app.area": "contact",
        action: "handle_contact_form_submission",
      },
    });

    return {
      status: "error",
      error: "Unable to send your message.",
      values,
    };
  }
}
