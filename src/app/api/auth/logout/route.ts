import { NextRequest, NextResponse } from "next/server";
import {
  callBackend,
  clearAccessCookie,
  errorResponse,
  isSameOriginRequest,
  readAccessToken,
} from "@/lib/auth/server";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return errorResponse("Yêu cầu không hợp lệ.", 403);
  }

  const accessToken = await readAccessToken();
  let response: NextResponse;

  if (accessToken) {
    const backendCookie = request.headers
      .get("cookie")
      ?.split(";")
      .map((cookie) => cookie.trim())
      .filter((cookie) => cookie.startsWith("refresh_token="))
      .join("; ");
    const backendResponse = await callBackend("/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(backendCookie ? { Cookie: backendCookie } : {}),
      },
    });
    response = new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      headers: {
        "Content-Type":
          backendResponse.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  } else {
    response = NextResponse.json({ message: "Đã đăng xuất." });
  }

  clearAccessCookie(response);
  return response;
}
