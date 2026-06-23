import { z } from "zod";
import { getAdminAuthState } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";
import { supportStatuses } from "@/lib/support";

const statusSchema = z.object({
  threadId: z.uuid(),
  status: z.enum(supportStatuses),
});

export async function POST(request: Request) {
  const auth = await getAdminAuthState();

  if (auth.status !== "admin") {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = statusSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid support status request." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("support_threads")
    .update({
      status: parsed.data.status,
      closed_at: parsed.data.status === "resolved" ? now : null,
    })
    .eq("id", parsed.data.threadId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return Response.json({ ok: true, thread: data });
}
