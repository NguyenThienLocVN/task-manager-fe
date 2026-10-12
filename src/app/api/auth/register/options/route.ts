import { NextResponse } from "next/server";
import { callBackend } from "@/lib/auth/server";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeList(value: unknown, label: string): unknown[] {
  const wrapped = asRecord(value);
  const unwrapped = wrapped && "data" in wrapped ? wrapped.data : value;
  if (Array.isArray(unwrapped)) return unwrapped;

  const record = asRecord(unwrapped);
  if (record && Array.isArray(record.items)) return record.items;
  throw new Error(`API không trả về danh sách ${label} hợp lệ.`);
}

function normalizeOrganization(value: unknown) {
  const record = asRecord(value);
  const id = record?.id;
  const name = record?.name;
  const isActive = record?.isActive ?? record?.is_active;

  if (
    (typeof id !== "string" && typeof id !== "number") ||
    typeof name !== "string" ||
    typeof isActive !== "boolean"
  ) {
    throw new Error("Dữ liệu cơ quan không hợp lệ.");
  }

  return isActive ? { id: String(id), name, isActive } : null;
}

function normalizeDepartment(value: unknown) {
  const record = asRecord(value);
  const id = record?.id;
  const organizationId = record?.organizationId ?? record?.organization_id;
  const name = record?.name;
  const isActive = record?.isActive ?? record?.is_active;

  if (
    (typeof id !== "string" && typeof id !== "number") ||
    (typeof organizationId !== "string" &&
      typeof organizationId !== "number") ||
    typeof name !== "string" ||
    typeof isActive !== "boolean"
  ) {
    throw new Error("Dữ liệu phòng ban không hợp lệ.");
  }

  return isActive
    ? { id: String(id), name, organizationId: String(organizationId), isActive }
    : null;
}

export async function GET() {
  const [organizationsResponse, departmentsResponse] = await Promise.all([
    callBackend("/organizations"),
    callBackend("/departments"),
  ]);

  if (!organizationsResponse.ok) {
    return new NextResponse(organizationsResponse.body, {
      status: organizationsResponse.status,
      headers: {
        "Content-Type":
          organizationsResponse.headers.get("content-type") ??
          "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  if (!departmentsResponse.ok) {
    return new NextResponse(departmentsResponse.body, {
      status: departmentsResponse.status,
      headers: {
        "Content-Type":
          departmentsResponse.headers.get("content-type") ?? "application/json",
        "Cache-Control": "no-store",
      },
    });
  }

  try {
    const [organizationData, departmentData] = await Promise.all([
      organizationsResponse.json() as Promise<unknown>,
      departmentsResponse.json() as Promise<unknown>,
    ]);
    const organizations = normalizeList(organizationData, "cơ quan")
      .map(normalizeOrganization)
      .filter((organization) => Boolean(organization));
    const departments = normalizeList(departmentData, "phòng ban")
      .map(normalizeDepartment)
      .filter((department) => Boolean(department));

    return NextResponse.json(
      { organizations, departments },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Không thể xử lý danh sách cơ quan và phòng ban.",
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
