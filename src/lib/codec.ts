import { QUESTIONS } from "./rules/questions";
import type { Answers } from "./rules/types";

/**
 * Odgovori se nose u URL-u da se izvještaj može poslati knjigovođi, spremiti u
 * bookmark i ispisati — bez računa i bez baze.
 *
 * Namjerno se kodiraju *eksplicitne vrijednosti*, ne indeksi izbora. Da se
 * koriste indeksi, preraspoređivanje jednog izbora u budućnosti bi tiho
 * promijenilo značenje svake već poslane poveznice. Kod alata za usklađenost
 * to je neprihvatljivo.
 */

const VERSION = 1;

const ALLOWED: Record<string, Set<string>> = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, new Set(q.choices.map((c) => String(c.value)))]),
);
const MULTI = new Set(QUESTIONS.filter((q) => q.multi).map((q) => String(q.id)));
const FIELDS = QUESTIONS.map((q) => String(q.id));

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeAnswers(a: Answers): string {
  return toBase64Url(JSON.stringify({ v: VERSION, ...a }));
}

/**
 * Vraća `null` za sve što nije valjan skup odgovora. Nikad ne popravlja i ne
 * pogađa vrijednosti — bolje je pokazati poruku nego izdati izvještaj
 * temeljen na krivo pročitanom ulazu.
 */
export function decodeAnswers(token: string | undefined | null): Answers | null {
  if (!token || token.length > 4000) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(fromBase64Url(token));
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;

  const obj = raw as Record<string, unknown>;
  if (obj.v !== VERSION) return null;

  const out: Record<string, unknown> = {};
  for (const field of FIELDS) {
    const value = obj[field];
    const allowed = ALLOWED[field];

    if (MULTI.has(field)) {
      if (!Array.isArray(value)) return null;
      if (value.some((v) => typeof v !== "string" || !allowed.has(v))) return null;
      // Duplikati bi udvostručili nalaze; skup ih uklanja.
      out[field] = [...new Set(value as string[])];
      continue;
    }

    if (typeof value !== "string" || !allowed.has(value)) return null;
    out[field] = value;
  }

  return out as unknown as Answers;
}
