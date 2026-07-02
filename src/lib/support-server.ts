import "server-only";
import { createServiceClient } from "@/lib/supabase/server";
import type {
  SupportMessage,
  SupportSource,
  SupportStatus,
  SupportThread,
} from "@/lib/support";

type SupabaseClient = ReturnType<typeof createServiceClient>;

type CreateSupportThreadInput = {
  customerEmail: string;
  customerName?: string | null;
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
  source: SupportSource;
  provider?: string | null;
  providerMessageId?: string | null;
  metadata?: Record<string, unknown>;
  status?: SupportStatus;
  supabaseClient?: SupabaseClient;
};

export async function createSupportThreadWithMessage({
  customerEmail,
  customerName,
  subject,
  bodyText,
  bodyHtml,
  source,
  provider,
  providerMessageId,
  metadata,
  status = "new",
  supabaseClient,
}: CreateSupportThreadInput) {
  const supabase = supabaseClient ?? createServiceClient();
  const now = new Date().toISOString();
  const { data: threadData, error: threadError } = await supabase
    .from("support_threads")
    .insert({
      customer_email: customerEmail,
      customer_name: customerName ?? null,
      subject,
      source,
      status,
      last_message_at: now,
      closed_at: status === "resolved" ? now : null,
    })
    .select("*")
    .single();

  if (threadError) {
    throw threadError;
  }

  const thread = threadData as SupportThread;
  const { data: messageData, error: messageError } = await supabase
    .from("support_messages")
    .insert({
      thread_id: thread.id,
      direction: "inbound",
      author_email: customerEmail,
      author_name: customerName ?? null,
      subject,
      body_text: bodyText,
      body_html: bodyHtml ?? null,
      provider: provider ?? null,
      provider_message_id: providerMessageId ?? null,
      metadata: metadata ?? {},
      created_at: now,
    })
    .select("*")
    .single();

  if (messageError) {
    throw messageError;
  }

  return {
    thread,
    message: messageData as SupportMessage,
  };
}
