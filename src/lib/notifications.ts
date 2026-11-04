export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  content: string;
  taskId: string;
  taskCode: string;
  taskTitle: string;
  isRead: boolean;
  createdAt: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pick(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function str(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function normalize(raw: unknown): NotificationItem {
  const item = asRecord(raw);
  const read = pick(item, "isRead", "is_read");
  return {
    id: str(pick(item, "id")),
    type: str(pick(item, "notificationType", "notification_type", "type")),
    title: str(pick(item, "title")),
    content: str(pick(item, "content", "message", "body")),
    taskId: str(pick(item, "taskId", "task_id")),
    taskCode: str(pick(item, "taskCode", "task_code")),
    taskTitle: str(pick(item, "taskTitle", "task_title")),
    isRead: read === true || read === 1 || read === "true" || read === "1",
    createdAt: str(pick(item, "createdAt", "created_at")),
  };
}

export function readNotificationPage(response: unknown, pageSize = 20) {
  const body = asRecord(response);
  const inner = asRecord(body.data);
  const listSource = Array.isArray(response)
    ? response
    : Array.isArray(body.data)
      ? body.data
      : Array.isArray(body.items)
        ? body.items
        : Array.isArray(inner.items)
          ? inner.items
          : [];
  const meta = { ...asRecord(body.meta), ...inner, ...body };
  const total = Number(
    pick(
      meta,
      "total",
      "totalItems",
      "total_items",
      "totalElements",
      "total_elements",
      "count",
    ) ?? listSource.length,
  );
  const totalPages = Number(
    pick(meta, "totalPages", "total_pages") ??
      Math.max(1, Math.ceil(total / pageSize)),
  );
  return {
    items: (listSource as unknown[]).map(normalize),
    total: Number.isFinite(total) ? total : listSource.length,
    totalPages: Number.isFinite(totalPages) && totalPages > 0 ? totalPages : 1,
  };
}

export function readUnreadCount(value: unknown): number | null {
  if (
    typeof value === "number" ||
    (typeof value === "string" && value.trim() !== "")
  ) {
    const count = Number(value);
    return Number.isFinite(count) && count >= 0 ? count : null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const response = asRecord(value);
  for (const key of [
    "unreadCount",
    "unread_count",
    "totalUnreadCount",
    "total_unread_count",
    "unread",
    "count",
    "total",
    "data",
    "result",
  ]) {
    const count = readUnreadCount(response[key]);
    if (count !== null) return count;
  }
  return null;
}

export function formatNotificationTime(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return date.toLocaleString("vi-VN");
}
