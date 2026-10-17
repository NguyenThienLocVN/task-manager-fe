import { NextRequest, NextResponse } from "next/server";
import {
  callBackend,
  errorResponse,
  isSameOriginRequest,
  setAccessCookie,
  setRefreshCookie,
  setSessionExpiryCookie,
  sessionMaxAge,
  tokenMaxAge,
} from "@/lib/auth/server";

function translateValidationMessage(message: unknown) {
  if (typeof message !== "string") return message;

  if (/^username must be longer than or equal to 3 characters$/i.test(message)) {
    return "Tên đăng nhập phải có ít nhất 3 ký tự.";
  }

  if (/^password must be longer than or equal to 8 characters$/i.test(message)) {
    return "Mật khẩu phải có ít nhất 8 ký tự.";
  }

  return message;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return errorResponse("Yêu cầu không hợp lệ.", 403);
  }

  let loginInput: unknown;
  try {
    loginInput = await request.json();
  } catch {
    return errorResponse("Dữ liệu đăng nhập không hợp lệ.", 400);
  }
  if (!loginInput || typeof loginInput !== "object" || Array.isArray(loginInput)) {
    return errorResponse("Dữ liệu đăng nhập không hợp lệ.", 400);
  }

  const loginRecord = loginInput as Record<string, unknown>;
  if (
    "rememberMe" in loginRecord &&
    typeof loginRecord.rememberMe !== "boolean"
  ) {
    return errorResponse("Tùy chọn ghi nhớ đăng nhập không hợp lệ.", 400);
  }
  const rememberMe = loginRecord.rememberMe === true;
  const backendLoginInput = Object.fromEntries(
    Object.entries(loginRecord).filter(([key]) => key !== "rememberMe"),
  );
  const maxSessionAge = sessionMaxAge(rememberMe);
  const sessionExpiresAt = Math.floor(Date.now() / 1000) + maxSessionAge;

  const loginResponse = await callBackend("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(backendLoginInput),
  });

  const responseBody = (await loginResponse.json().catch(() => null)) as
    | { accessToken?: unknown; user?: unknown; message?: unknown }
    | null;

  if (!loginResponse.ok) {
    if (responseBody && "message" in responseBody) {
      const message = responseBody.message;
      responseBody.message = Array.isArray(message)
        ? message.map(translateValidationMessage)
        : translateValidationMessage(message);
    }

    return NextResponse.json(responseBody ?? { message: "Đăng nhập thất bại." }, {
      status: loginResponse.status,
    });
  }

  if (typeof responseBody?.accessToken !== "string" || !responseBody.user) {
    return errorResponse("Phản hồi đăng nhập từ backend không hợp lệ.", 502);
  }

  const maxAge = tokenMaxAge(responseBody.accessToken);
  if (maxAge <= 0) {
    return errorResponse("Backend trả về access token đã hết hạn.", 502);
  }

  const remainingSessionAge = Math.max(
    0,
    sessionExpiresAt - Math.floor(Date.now() / 1000),
  );
  if (remainingSessionAge <= 0) {
    return errorResponse("Thời hạn phiên đăng nhập đã hết.", 502);
  }

  const response = NextResponse.json({ user: responseBody.user });
  if (
    !setRefreshCookie(
      response,
      loginResponse.headers.getSetCookie(),
      remainingSessionAge,
    )
  ) {
    return errorResponse("Backend không trả về refresh token hợp lệ.", 502);
  }
  setSessionExpiryCookie(response, sessionExpiresAt, remainingSessionAge);
  setAccessCookie(
    response,
    responseBody.accessToken,
    Math.min(maxAge, remainingSessionAge),
  );
  return response;
}
