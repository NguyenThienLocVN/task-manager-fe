import { NextResponse } from "next/server";
import {
  callBackend,
  clearAccessCookie,
  errorResponse,
  readAccessToken,
} from "@/lib/auth/server";

export async function GET() {
  const accessToken = await readAccessToken();
  if (!accessToken) return errorResponse("Chưa đăng nhập.", 401);

  const backendResponse = await callBackend("/auth/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const response = new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: {
      "Content-Type":
        backendResponse.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });

  if (backendResponse.status === 401) clearAccessCookie(response);
  return response;
}
