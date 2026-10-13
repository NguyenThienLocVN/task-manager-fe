import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ACCESS_TOKEN_COOKIE = "task_manager_access";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api"
).replace(/\/+$/, "");

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
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

export async function readAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
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
    maxAge,
  });
}

export function backendUrlForApiPath(path: string) {
  return `${API_BASE_URL}/${path}`;
}
