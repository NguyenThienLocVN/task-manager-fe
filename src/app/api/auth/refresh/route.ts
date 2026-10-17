import { NextRequest, NextResponse } from "next/server";
import {
  callBackend,
  clearAccessCookie,
  clearRefreshCookie,
  clearSessionExpiryCookie,
  errorResponse,
  isSameOriginRequest,
  readCookieHeader,
  REFRESH_TOKEN_COOKIE,
  remainingSessionAge,
  SESSION_EXPIRY_COOKIE,
  setAccessCookie,
  tokenMaxAge,
} from "@/lib/auth/server";

function clearSession(response: NextResponse) {
  clearAccessCookie(response);
  clearRefreshCookie(response);
  clearSessionExpiryCookie(response);
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return errorResponse("Yêu cầu không hợp lệ.", 403);
  }

  const refreshCookie = readCookieHeader(request, REFRESH_TOKEN_COOKIE);
  const sessionAge = remainingSessionAge(
    request.cookies.get(SESSION_EXPIRY_COOKIE)?.value,
  );
  if (!refreshCookie || sessionAge <= 0) {
    const response = errorResponse(
      refreshCookie ? "Phiên đăng nhập đã hết hạn." : "Thiếu refresh token",
      401,
    );
    clearSession(response);
    return response;
  }

  const backendResponse = await callBackend("/auth/refresh", {
    method: "POST",
    headers: { Cookie: refreshCookie },
  });

  if (!backendResponse.ok) {
    const response = new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      headers: {
        "Content-Type":
          backendResponse.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
    if (backendResponse.status === 401) clearSession(response);
    return response;
  }

  const responseBody = (await backendResponse.json().catch(() => null)) as
    | { accessToken?: unknown }
    | null;
  if (typeof responseBody?.accessToken !== "string") {
    return errorResponse("Phản hồi làm mới phiên từ backend không hợp lệ.", 502);
  }

  const accessTokenAge = tokenMaxAge(responseBody.accessToken);
  if (accessTokenAge <= 0) {
    return errorResponse("Backend trả về access token đã hết hạn.", 502);
  }

  const response = NextResponse.json({ refreshed: true });
  setAccessCookie(
    response,
    responseBody.accessToken,
    Math.min(accessTokenAge, sessionAge),
  );
  return response;
}
