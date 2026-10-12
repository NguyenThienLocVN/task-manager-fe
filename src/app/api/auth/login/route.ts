import { NextRequest, NextResponse } from "next/server";
import {
  callBackend,
  errorResponse,
  isSameOriginRequest,
  setAccessCookie,
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

  const loginResponse = await callBackend("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: await request.text(),
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

  const response = NextResponse.json({ user: responseBody.user });
  setAccessCookie(response, responseBody.accessToken, maxAge);
  return response;
}
