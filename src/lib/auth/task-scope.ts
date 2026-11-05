import type { AuthUser } from "@/lib/auth/api";

export type TaskScope = "all" | "department" | "assigned";

type ScopedTask = {
  departmentId?: string;
  department?: string;
  departmentName?: string;
  responsibleUserId?: string;
};

function roleNames(user: AuthUser | null): string[] {
  return (user?.roles ?? [])
    .map((role) => (typeof role === "string" ? role : role?.name ?? ""))
    .map((role) => role.trim().toUpperCase());
}

export function getTaskScope(user: AuthUser | null): TaskScope {
  const roles = roleNames(user);
  if (roles.includes("ADMIN") || roles.includes("LANH_DAO_CO_QUAN")) return "all";
  if (roles.includes("LANH_DAO_PHONG")) return "department";
  return "assigned";
}

function userDepartment(user: AuthUser | null): { id: string; name: string } {
  const department = user?.department;
  if (!department) return { id: "", name: "" };
  if (typeof department === "string") return { id: "", name: department.trim().toLowerCase() };
  return {
    id: department.id === undefined ? "" : String(department.id),
    name: (department.name ?? department.departmentName ?? department.department_name ?? "").trim().toLowerCase(),
  };
}

export function filterTasksByScope<T extends ScopedTask>(tasks: T[], user: AuthUser | null, scope = getTaskScope(user)): T[] {
  if (scope === "all") return tasks;
  if (!user) return [];
  if (scope === "assigned") {
    return tasks.filter((task) => task.responsibleUserId === String(user.id));
  }
  const own = userDepartment(user);
  return tasks.filter((task) => {
    if (own.id && task.departmentId) return task.departmentId === own.id;
    const name = (task.departmentName ?? task.department ?? "").trim().toLowerCase();
    return Boolean(own.name) && name === own.name;
  });
}
