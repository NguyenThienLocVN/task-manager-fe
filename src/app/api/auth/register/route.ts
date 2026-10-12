import { NextRequest, NextResponse } from "next/server";
import {
  callBackend,
  errorResponse,
  isSameOriginRequest,
} from "@/lib/auth/server";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function isOptionalString(
  value: unknown,
): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return errorResponse("Yêu cầu không hợp lệ.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Dữ liệu đăng ký không hợp lệ.", 400);
  }

  const input = asRecord(body);
  if (!input) {
    return errorResponse("Dữ liệu đăng ký không hợp lệ.", 400);
  }

  const { username, password, fullName, organizationId } = input;
  if (
    typeof username !== "string" ||
    username.trim().length < 3 ||
    typeof password !== "string" ||
    password.length < 8 ||
    typeof fullName !== "string" ||
    !fullName.trim() ||
    (typeof organizationId !== "string" && typeof organizationId !== "number") ||
    !isOptionalString(input.email) ||
    !isOptionalString(input.phone) ||
    !isOptionalString(input.departmentId) ||
    !isOptionalString(input.jobTitle)
  ) {
    return errorResponse("Vui lòng kiểm tra lại thông tin đăng ký.", 400);
  }

  const backendResponse = await callBackend("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: username.trim(),
      password,
      fullName: fullName.trim(),
      email: input.email ?? null,
      phone: input.phone ?? null,
      organizationId: String(organizationId),
      departmentId: input.departmentId ?? null,
      jobTitle: input.jobTitle ?? null,
    }),
  });

  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: {
      "Content-Type":
        backendResponse.headers.get("content-type") ?? "application/json",
      "Cache-Control": "no-store",
    },
  });
}
