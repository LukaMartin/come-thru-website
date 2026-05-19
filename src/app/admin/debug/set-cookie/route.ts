import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();

  cookieStore.set("admin_debug_cookie", "present", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 5,
  });

  redirect("/admin/debug");
}
