import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const adminAccessTokenCookie = "admin_sb_access_token";
const adminRefreshTokenCookie = "admin_sb_refresh_token";
const refreshLeewaySeconds = 60;
const refreshTokenMaxAge = 60 * 60 * 24 * 1;

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (normalized.length % 4)) % 4;

  return atob(normalized.padEnd(normalized.length + padding, "="));
}

function getJwtExp(token: string) {
  try {
    const payload = token.split(".")[1];

    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(decodeBase64Url(payload)) as { exp?: number };

    return typeof decoded.exp === "number" ? decoded.exp : null;
  } catch {
    return null;
  }
}

function isPrefetchRequest(request: NextRequest) {
  return (
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch" ||
    request.headers.get("sec-purpose") === "prefetch"
  );
}

function setRequestCookieHeader(headers: Headers, name: string, value: string) {
  const cookies = (headers.get("cookie") ?? "")
    .split(";")
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie && !cookie.startsWith(`${name}=`));

  cookies.push(`${name}=${value}`);
  headers.set("cookie", cookies.join("; "));
}

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get(adminAccessTokenCookie)?.value;
  const refreshToken = request.cookies.get(adminRefreshTokenCookie)?.value;

  if (!refreshToken) {
    return NextResponse.next();
  }

  if (isPrefetchRequest(request)) {
    return NextResponse.next();
  }

  const expiresAt = accessToken ? getJwtExp(accessToken) : null;
  const shouldRefresh =
    !expiresAt ||
    expiresAt - Math.floor(Date.now() / 1000) <= refreshLeewaySeconds;

  if (!shouldRefresh) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_AUTH_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    return NextResponse.next();
  }

  const tokenResponse = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
  );

  if (!tokenResponse.ok) {
    // Refresh tokens rotate; a concurrent request may have already replaced this one.
    return NextResponse.next();
  }

  const payload = (await tokenResponse.json()) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
  };

  if (!payload.access_token || !payload.refresh_token) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  setRequestCookieHeader(
    requestHeaders,
    adminAccessTokenCookie,
    payload.access_token,
  );
  setRequestCookieHeader(
    requestHeaders,
    adminRefreshTokenCookie,
    payload.refresh_token,
  );

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const cookieOptions = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };

  response.cookies.set(adminAccessTokenCookie, payload.access_token, {
    ...cookieOptions,
    maxAge: payload.expires_in ?? 60 * 60,
  });
  response.cookies.set(adminRefreshTokenCookie, payload.refresh_token, {
    ...cookieOptions,
    maxAge: refreshTokenMaxAge,
  });

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
