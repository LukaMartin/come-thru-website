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

export type StoredAdminSessionCookieState =
  | { status: "present"; session: StoredAdminSession }
  | {
      status: "missing";
      reason:
        | "missing-session-cookie"
        | "missing-access-token-cookie"
        | "missing-refresh-token-cookie";
    };

const cookieOptions = {
  httpOnly: true,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export async function getStoredAdminSessionCookieState(): Promise<StoredAdminSessionCookieState> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(adminAccessTokenCookie)?.value;
  const refreshToken = cookieStore.get(adminRefreshTokenCookie)?.value;

  if (!accessToken && !refreshToken) {
    return { status: "missing", reason: "missing-session-cookie" };
  }

  if (!accessToken) {
    return { status: "missing", reason: "missing-access-token-cookie" };
  }

  if (!refreshToken) {
    return { status: "missing", reason: "missing-refresh-token-cookie" };
  }

  return {
    status: "present",
    session: { accessToken, refreshToken } satisfies StoredAdminSession,
  };
}

export async function getStoredAdminSession() {
  const cookieState = await getStoredAdminSessionCookieState();

  if (cookieState.status === "missing") {
    return null;
  }

  return cookieState.session;
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
