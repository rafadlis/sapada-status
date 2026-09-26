"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const refreshIntervalMs = 60_000;

export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let lastRefresh = Date.now();
    const refreshIfDue = () => {
      if (document.visibilityState !== "visible" || Date.now() - lastRefresh < refreshIntervalMs) return;
      lastRefresh = Date.now();
      router.refresh();
    };

    const interval = window.setInterval(refreshIfDue, refreshIntervalMs);
    document.addEventListener("visibilitychange", refreshIfDue);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshIfDue);
    };
  }, [router]);

  return null;
}
