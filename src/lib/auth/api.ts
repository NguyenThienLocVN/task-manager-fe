export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const AUTH_SESSION_EXPIRED_EVENT = "task-manager:session-expired";

export type AuthUser = {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  organization: string | null;
  department:
    | string
    | {
        id?: string | number;
        name?: string | null;
        departmentName?: string | null;
        department_name?: string | null;
      }
    | null;
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

type RefreshResult = {
  ok: boolean;
  status: number;
  message: string;
};

let refreshInFlight: Promise<RefreshResult> | null = null;

function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = fetch(getLocalApiPath("/auth/refresh"), {
      method: "POST",
      credentials: "include",
      cache: "no-store",
    })
      .then(async (response) => ({
        ok: response.ok,
        status: response.status,
        message: response.ok ? "" : await getErrorMessage(response),
      }))
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function shouldRefreshAfterUnauthorized(path: string) {
  const normalizedPath = path.replace(/^\/+/, "");
  return ![
    "auth/login",
    "auth/refresh",
    "auth/logout",
    "auth/register",
    "auth/register/options",
  ].includes(normalizedPath);
}

function notifySessionExpired() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const requestPath = getLocalApiPath(path);
  const headers = new Headers(options.headers);
  if (
    typeof options.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const sendRequest = () =>
    fetch(requestPath, {
      ...options,
      headers,
      credentials: options.credentials ?? "same-origin",
      cache: "no-store",
    });

  let response = await sendRequest();
  if (response.status === 401 && shouldRefreshAfterUnauthorized(path)) {
    const refresh = await refreshAccessToken();
    if (refresh.status === 401) notifySessionExpired();
    if (!refresh.ok) {
      throw new ApiError(refresh.message, refresh.status);
    }

    response = await sendRequest();
    if (response.status === 401) notifySessionExpired();
  }

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
