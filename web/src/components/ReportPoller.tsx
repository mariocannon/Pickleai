"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** While a report is processing, refresh the page every few seconds. */
export function ReportPoller() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 4000);
    return () => clearInterval(t);
  }, [router]);
  return null;
}
