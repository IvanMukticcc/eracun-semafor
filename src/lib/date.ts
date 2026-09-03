/**
 * Sve u aplikaciji računa se prema hrvatskom vremenu, neovisno o tome gdje
 * server stoji. Rokovi u Zakonu su kalendarski datumi, a ne UTC trenuci.
 */

const ZAGREB = "Europe/Zagreb";

/** Današnji dan u Hrvatskoj, ISO oblik YYYY-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZAGREB,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function daysUntil(targetISO: string, fromISO: string = todayISO()): number {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${targetISO}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** Dana do početka obveze izdavanja za obveznike izvan sustava PDV-a. */
export function daysUntil2027(fromISO: string = todayISO()): number {
  return Math.max(0, daysUntil("2027-01-01", fromISO));
}

/** 2026-09-03 → "3.9.2026." */
export function formatHr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y}.`;
}

/** Hrvatska deklinacija uz broj: 1 dan, 2 dana, 5 dana. */
export function danaLabel(n: number): string {
  return n === 1 ? "dan" : "dana";
}
