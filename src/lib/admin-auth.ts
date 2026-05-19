import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

import {
  clearAdminSessionCookies,
  getJwtPayload,
  getStoredAdminSession,
  getStoredAdminSessionCookieState,
  setAdminSessionCookies,
} from "@/lib/admin-session";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";

export type AdminAuthState =
  | {
      status: "anonymous";
      reason:
        | "missing-session-cookie"
        | "missing-access-token-cookie"
        | "missing-refresh-token-cookie"
        | "supabase-set-session-failed"
        | "supabase-get-user-failed";
    }
  | { status: "not_admin"; user: User }
  | { status: "needs_mfa"; user: User }
  | { status: "admin"; user: User };

export async function createSessionAuthClient() {
  const session = await getStoredAdminSession();

  if (!session) {
    throw new Error("Admin session is missing.");
  }

  const supabase = createAuthClient();
  const { data, error } = await supabase.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });

  if (error || !data.session) {
    throw new Error("Admin session has expired.");
  }

  return { supabase, session: data.session };
}

export async function persistCurrentAuthSession(
  supabase: ReturnType<typeof createAuthClient>,
) {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    throw new Error("Admin session could not be persisted.");
  }

  await setAdminSessionCookies(data.session);
}

async function isApprovedAdmin(userId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function getAdminAuthState(): Promise<AdminAuthState> {
  const cookieState = await getStoredAdminSessionCookieState();

  if (cookieState.status === "missing") {
    return { status: "anonymous", reason: cookieState.reason };
  }

  const { session } = cookieState;
  const supabase = createAuthClient();
  const { data: sessionData, error: sessionError } =
    await supabase.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });

  if (sessionError || !sessionData.session) {
    return { status: "anonymous", reason: "supabase-set-session-failed" };
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { status: "anonymous", reason: "supabase-get-user-failed" };
  }

  const isAdmin = await isApprovedAdmin(data.user.id);

  if (!isAdmin) {
    return { status: "not_admin", user: data.user };
  }

  const assuranceLevel =
    getJwtPayload(sessionData.session.access_token)?.aal ??
    getJwtPayload(session.accessToken)?.aal;

  if (assuranceLevel !== "aal2") {
    return { status: "needs_mfa", user: data.user };
  }

  return { status: "admin", user: data.user };
}

export async function requireAdmin() {
  const state = await getAdminAuthState();

  if (state.status === "anonymous") {
    redirect(`/admin/login?error=${state.reason}`);
  }

  if (state.status === "needs_mfa") {
    redirect("/admin/mfa");
  }

  if (state.status === "not_admin") {
    redirect("/admin/login?error=not-authorized");
  }

  return state.user;
}

export async function requireAdminForMfa() {
  const state = await getAdminAuthState();

  if (state.status === "anonymous") {
    redirect(`/admin/login?error=${state.reason}`);
  }

  if (state.status === "not_admin") {
    await clearAdminSessionCookies();
    redirect("/admin/login?error=not-authorized");
  }

  if (state.status === "admin") {
    redirect("/admin/events");
  }

  return state.user;
}

export async function signInAdmin(email: string, password: string) {
  const supabase = createAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session || !data.user) {
    return { error: "Invalid email or password." };
  }

  const isAdmin = await isApprovedAdmin(data.user.id);

  if (!isAdmin) {
    return { error: "This account is not authorized for admin access." };
  }

  await setAdminSessionCookies(data.session);

  return { ok: true };
}

export async function signOutAdmin() {
  const session = await getStoredAdminSession();

  if (session) {
    const supabase = createAuthClient();
    await supabase.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });
    await supabase.auth.signOut();
  }

  await clearAdminSessionCookies();
}
