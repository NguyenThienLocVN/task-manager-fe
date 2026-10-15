export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type AuthUser = {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  organization: string | null;
  department: string | null;
  roles: string[];
  permissions: string[];
  isActive?: boolean;
  isLocked?: boolean;
  lastLoginAt?: string | null;
};


function getLocalApiPath(path: string): string {
  const normalizedPath = path.replace(/^\/+/, "");
  return `/api/${normalizedPath}`;
}

async function getErrorMessage(response: Response) {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "message" in body) {
      const message = body.message;
      if (typeof message === "string") return message;
      if (Array.isArray(message)) return message.join(", ");
    }
  } catch {
    // Some server errors do not return JSON.
  }

  return `Yêu cầu thất bại (${response.status})`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(getLocalApiPath(path), {
    ...options,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ApiError(await getErrorMessage(response), response.status);
  }

  if (
    response.status === 204 ||
    !response.headers.get("content-type")?.includes("json")
  ) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
