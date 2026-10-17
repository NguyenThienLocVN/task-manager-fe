import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ACCESS_TOKEN_COOKIE = "task_manager_access";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
export const SESSION_EXPIRY_COOKIE = "task_manager_session_expiry";

const API_BASE_URL = (
  process.env.BACKEND_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001/api"
).replace(/\/+$/, "");

const DEFAULT_SESSION_MAX_AGE = 7 * 24 * 60 * 60;
const REMEMBERED_SESSION_MAX_AGE = 15 * 24 * 60 * 60;

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  const allowedOrigins = [
    "https://qlcv.aiphuongtankhai.vn",
    "http://localhost:3000",
  ];

  try {
    const parsedOrigin = new URL(origin);
    return allowedOrigins.includes(parsedOrigin.origin);
  } catch {
    return false;
  }
}

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function callBackend(
  path: string,
  init: RequestInit = {},
) {
  return fetch(`${API_BASE_URL}/${path.replace(/^\/+/, "")}`, {
    ...init,
    cache: "no-store",
  });
}

export async function proxyPublicGet(path: string) {
  const backendResponse = await callBackend(path);
  const headers = new Headers({
    "Cache-Control": "no-store",
  });
  const contentType = backendResponse.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers,
  });
}

export async function readAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
}

export function readCookieHeader(request: Request, name: string) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) => cookie.slice(0, cookie.indexOf("=")) === name) ?? null
  );
}

export function sessionMaxAge(rememberMe: boolean) {
  return rememberMe
    ? REMEMBERED_SESSION_MAX_AGE
    : DEFAULT_SESSION_MAX_AGE;
}

export function remainingSessionAge(expiresAt: string | undefined) {
  const expiry = Number(expiresAt);
  if (!Number.isSafeInteger(expiry)) return 0;
  return Math.max(0, Math.floor(expiry - Date.now() / 1000));
}

export function tokenMaxAge(token: string) {
  const payload = token.split(".")[1];
  if (!payload) return 15 * 60;

  try {
    const decoded: unknown = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    );
    if (
      !decoded ||
      typeof decoded !== "object" ||
      !("exp" in decoded) ||
      typeof decoded.exp !== "number"
    ) {
      return 15 * 60;
    }

    return Math.max(0, Math.floor(decoded.exp - Date.now() / 1000));
  } catch {
    return 15 * 60;
  }
}

export function clearAccessCookie(response: NextResponse) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
    maxAge: 0,
  });
}

export function clearRefreshCookie(response: NextResponse) {
  response.cookies.set(REFRESH_TOKEN_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
    maxAge: 0,
  });
}

export function clearSessionExpiryCookie(response: NextResponse) {
  response.cookies.set(SESSION_EXPIRY_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
    maxAge: 0,
  });
}

export function setRefreshCookie(
  response: NextResponse,
  setCookieHeaders: string[],
  maxAge: number,
) {
  const refreshCookie = setCookieHeaders.find((header) => {
    const separator = header.indexOf("=");
    return (
      separator > 0 &&
      header.slice(0, separator).trim() === REFRESH_TOKEN_COOKIE
    );
  });
  if (!refreshCookie) return false;

  const separator = refreshCookie.indexOf("=");
  const value = refreshCookie.slice(separator + 1).split(";")[0].trim();
  if (!value) return false;

  response.cookies.set(REFRESH_TOKEN_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
    maxAge,
  });
  return true;
}

export function setSessionExpiryCookie(
  response: NextResponse,
  expiresAt: number,
  maxAge: number,
) {
  response.cookies.set(SESSION_EXPIRY_COOKIE, String(expiresAt), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
    maxAge,
  });
}

export function setAccessCookie(
  response: NextResponse,
  token: string,
  maxAge: number,
) {
  response.cookies.set(ACCESS_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api",
    maxAge: Math.min(maxAge, REMEMBERED_SESSION_MAX_AGE),
  });
}

export function backendUrlForApiPath(path: string) {
  return `${API_BASE_URL}/${path}`;
}
