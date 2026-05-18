import "server-only";

import type { Session } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const adminAccessTokenCookie = "admin_sb_access_token";
export const adminRefreshTokenCookie = "admin_sb_refresh_token";

const refreshTokenMaxAge = 60 * 60 * 24 * 1;

type StoredAdminSession = {
  accessToken: string;
  refreshToken: string;
};

const cookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export async function getStoredAdminSession() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(adminAccessTokenCookie)?.value;
  const refreshToken = cookieStore.get(adminRefreshTokenCookie)?.value;

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken } satisfies StoredAdminSession;
}

export async function setAdminSessionCookies(session: Session) {
  const cookieStore = await cookies();

  cookieStore.set(adminAccessTokenCookie, session.access_token, {
    ...cookieOptions,
    maxAge: session.expires_in ?? 60 * 60,
  });
  cookieStore.set(adminRefreshTokenCookie, session.refresh_token, {
    ...cookieOptions,
    maxAge: refreshTokenMaxAge,
  });
}

export async function clearAdminSessionCookies() {
  const cookieStore = await cookies();

  cookieStore.delete(adminAccessTokenCookie);
  cookieStore.delete(adminRefreshTokenCookie);
}

export function getJwtPayload(token: string) {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      aal?: string;
      exp?: number;
      sub?: string;
    };
  } catch {
    return null;
  }
}
