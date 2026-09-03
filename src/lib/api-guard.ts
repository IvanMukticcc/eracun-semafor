import { NextResponse } from "next/server";

/**
 * Zajednička zaštita za javne POST rute. Namjerno skromna: ovo je obrazac koji
 * ispuni nekoliko ljudi dnevno, ne javni API. Cilj je zaustaviti grubo slanje i
 * očito neispravan ulaz, ne izgraditi WAF.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const OIB = /^[0-9]{11}$/;

const buckets = new Map<string, number[]>();

export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "nepoznato"
  );
}

export function rateLimited(key: string, max = 5, windowMs = 10 * 60 * 1000): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  buckets.set(key, hits);
  // Bez ovoga bi mapa rasla dok proces živi.
  if (buckets.size > 5000) buckets.clear();
  return hits.length > max;
}

export const jsonError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

export function validEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 254 && EMAIL.test(value);
}

export function validOib(value: string): boolean {
  return OIB.test(value);
}

/** Botu odgovaramo uspjehom da ne nauči što ga je odalo. */
export function isHoneypot(body: Record<string, unknown>): boolean {
  return typeof body.website === "string" && body.website.length > 0;
}

export function text(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await request.json();
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
