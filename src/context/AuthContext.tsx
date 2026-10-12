"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  apiRequest,
  ApiError,
  AuthUser,
} from "@/lib/auth/api";

type LoginResponse = {
  user: AuthUser;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  restoreError: string | null;
  logoutError: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  retrySessionRestore: () => Promise<void>;
  getCurrentUser: () => Promise<AuthUser>;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const getCurrentUser = useCallback(async () => {
    const currentUser = await apiRequest<AuthUser>("/auth/me");
    setUser(currentUser);
    return currentUser;
  }, []);

  const retrySessionRestore = useCallback(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await getCurrentUser();
        setRestoreError(null);
        setLoading(false);
        return;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setUser(null);
          setRestoreError(null);
          setLoading(false);
          return;
        }

        const canRetry =
          attempt < 2 &&
          (!(error instanceof ApiError) || error.status >= 500);
        if (canRetry) {
          await new Promise((resolve) =>
            setTimeout(resolve, attempt === 0 ? 300 : 900),
          );
          continue;
        }

        setRestoreError(
          "Không thể khôi phục phiên đăng nhập do lỗi kết nối hoặc máy chủ. Hãy thử lại.",
        );
        setLoading(false);
        return;
      }
    }
  }, [getCurrentUser]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void retrySessionRestore();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [retrySessionRestore]);

  const login = useCallback(
    async (username: string, password: string) => {
      setRestoreError(null);
      const result = await apiRequest<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (!result.user) {
        throw new Error("API đăng nhập không trả về thông tin người dùng.");
      }

      await getCurrentUser();
    },
    [getCurrentUser],
  );

  const logout = useCallback(async () => {
    setLogoutError(null);
    try {
      await apiRequest<void>("/auth/logout", { method: "POST" });
    } catch {
      setLogoutError("Không thể xác nhận thu hồi phiên với máy chủ.");
    } finally {
      setUser(null);
      router.replace("/dang-nhap");
    }
  }, [router]);

  const hasRole = useCallback(
    (role: string) => user?.roles.includes(role) ?? false,
    [user],
  );
  const hasPermission = useCallback(
    (permission: string) => user?.permissions.includes(permission) ?? false,
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,
      restoreError,
      logoutError,
      login,
      logout,
      retrySessionRestore,
      getCurrentUser,
      hasRole,
      hasPermission,
    }),
    [
      user,
      loading,
      restoreError,
      logoutError,
      login,
      logout,
      retrySessionRestore,
      getCurrentUser,
      hasRole,
      hasPermission,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth phải được sử dụng bên trong AuthProvider.");
  }
  return context;
}
