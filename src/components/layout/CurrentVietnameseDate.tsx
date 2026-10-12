"use client";

import { useSyncExternalStore } from "react";

function formatVietnameseDate(date: Date) {
  const weekday =
    date.getDay() === 0 ? "Chủ nhật" : `Thứ ${date.getDay() + 1}`;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${weekday}, ${day}/${month}/${date.getFullYear()}`;
}

export default function CurrentVietnameseDate() {
  const currentDate = useSyncExternalStore(
    (onStoreChange) => {
      const timeoutId = window.setTimeout(onStoreChange, 0);
      window.addEventListener("focus", onStoreChange);
      return () => {
        window.clearTimeout(timeoutId);
        window.removeEventListener("focus", onStoreChange);
      };
    },
    () => formatVietnameseDate(new Date()),
    () => "",
  );

  return <span>{currentDate}</span>;
}
