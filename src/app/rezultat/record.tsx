"use client";

import { useEffect } from "react";

/**
 * Bilježi dovršenu provjeru jednom po tokenu i po kartici. Bez ovog čuvara
 * svako osvježavanje stranice ili povratak na poveznicu napuhalo bi statistiku.
 */
export function RecordAssessment({ token }: { token: string }) {
  useEffect(() => {
    if (!token) return;
    const key = `rec:${token}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Privatni način rada blokira sessionStorage; radije preskoči nego pukni.
      return;
    }
    void fetch("/api/assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      keepalive: true,
    }).catch(() => {});
  }, [token]);

  return null;
}
