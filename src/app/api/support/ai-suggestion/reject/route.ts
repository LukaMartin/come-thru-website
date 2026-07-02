import { z } from "zod";
import { getAdminAuthState } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  normalizeSupportAiSuggestion,
  type SupportAiSuggestion,
} from "@/lib/support";

const rejectSuggestionSchema = z.object({
  suggestionId: z.uuid(),
});

export async function POST(request: Request) {
  const auth = await getAdminAuthState();

  if (auth.status !== "admin") {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = rejectSuggestionSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid AI suggestion reject request." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();
  
  const { data, error } = await supabase
    .from("support_ai_suggestions")
    .update({
      draft_reply_outcome: "rejected",
      draft_reply_outcome_at: now,
      draft_reply_used_message_id: null,
    })
    .eq("id", parsed.data.suggestionId)
    .eq("draft_reply_outcome", "unused")
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return Response.json(
      { error: "This AI draft has already been used or rejected." },
      { status: 409 },
    );
  }

  return Response.json({
    ok: true,
    aiSuggestion: normalizeSupportAiSuggestion(data as SupportAiSuggestion),
  });
}
