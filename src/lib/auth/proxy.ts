import { NextRequest, NextResponse } from "next/server";
import {
  backendUrlForApiPath,
  errorResponse,
  isSameOriginRequest,
  readAccessToken,
} from "@/lib/auth/server";

const ALLOWED_METHODS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
]);

export async function proxyAuthenticatedApiRequest(
  request: NextRequest,
  path: string[],
) {
  if (!ALLOWED_METHODS.has(request.method)) {
    return errorResponse("Phương thức không được hỗ trợ.", 405);
  }

  if (
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    !isSameOriginRequest(request)
  ) {
    return errorResponse("Yêu cầu không hợp lệ.", 403);
  }

  if (
    path.length === 0 ||
    path.some((part) => {
      let decoded: string;
      try {
        decoded = decodeURIComponent(part);
      } catch {
        return true;
      }
      return (
        !decoded ||
        decoded === "." ||
        decoded === ".." ||
        decoded.includes("/") ||
        decoded.includes("\\") ||
        decoded.toLowerCase() === "auth"
      );
    })
  ) {
    return errorResponse("Đường dẫn API không hợp lệ.", 400);
  }

  const accessToken = await readAccessToken();
  if (!accessToken) return errorResponse("Chưa đăng nhập.", 401);

  const backendUrl = new URL(
    backendUrlForApiPath(path.map(encodeURIComponent).join("/")),
  );
  backendUrl.search = request.nextUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  const range = request.headers.get("range");
  const ifRange = request.headers.get("if-range");
  if (contentType) headers.set("Content-Type", contentType);
  if (accept) headers.set("Accept", accept);
  if (range) headers.set("Range", range);
  if (ifRange) headers.set("If-Range", ifRange);
  headers.set("Authorization", `Bearer ${accessToken}`);

  const backendResponse = await fetch(backendUrl, {
    method: request.method,
    headers,
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer(),
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  for (const headerName of [
    "content-type",
    "content-disposition",
    "content-length",
    "accept-ranges",
    "content-range",
  ]) {
    const headerValue = backendResponse.headers.get(headerName);
    if (headerValue) responseHeaders.set(headerName, headerValue);
  }
  responseHeaders.set("Cache-Control", "no-store");

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}
