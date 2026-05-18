import { redirect } from "next/navigation";
import { signOutAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await signOutAdmin();
  redirect("/admin/login");
}
