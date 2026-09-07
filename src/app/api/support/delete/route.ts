import z from "zod";
import { getAdminAuthState } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/server";

const deleteSchema = z.object({
  threadId: z.uuid(),
});

export async function POST(request: Request) {
  const auth = await getAdminAuthState();

  if (auth.status !== "admin") {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = deleteSchema.safeParse(await request.json());

  if (!parsed.success) {
    return Response.json(
      { error: "Invalid support reply request." },
      { status: 400 },
    );
  }

  const supabase = createServiceClient();

  const { error: deleteError } = await supabase
    .from("support_threads")
    .delete()
    .eq("id", parsed.data.threadId);

  if (deleteError) {
    throw deleteError;
  }

  return Response.json({ success: true });
}
