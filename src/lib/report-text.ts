import type { Assessment } from "./rules/types";
import { buildHandoff } from "./rules/handoff";
import { SEVERITY_LABEL, AREA_LABEL } from "./labels";
import { formatHr } from "./date";
import { SOURCES } from "./rules/sources";

/**
 * Verzija izvještaja za lijepljenje u e-mail knjigovođi. Namjerno običan tekst:
 * preživi svaki mail klijent i ne izgubi se u formatiranju.
 */
export function reportAsText(a: Assessment, url?: string): string {
  const L: string[] = [];
  L.push("IZVJEŠTAJ O SPREMNOSTI ZA eRAČUN / FISKALIZACIJU 2.0");
  L.push(`Napravljen: ${formatHr(a.assessedOn)}`);
  L.push(`Kategorija: ${a.profile.categoryLabel}`);
  if (a.profile.receiveFrom) L.push(`Obveza zaprimanja od: ${formatHr(a.profile.receiveFrom)}`);
  if (a.profile.issueFrom) L.push(`Obveza izdavanja od: ${formatHr(a.profile.issueFrom)}`);
  L.push(
    `Nalazi: ${a.counts.kriticno} kritično, ${a.counts.rizik} rizik, ${a.counts.provjeri} za provjeru, ${a.counts.ok} uredno`,
  );
  L.push("");

  for (const f of a.findings) {
    L.push(`[${SEVERITY_LABEL[f.severity].toUpperCase()}] ${AREA_LABEL[f.area]} — ${f.title}`);
    L.push(f.what);
    if (f.why) L.push(f.why);
    L.push(`Sljedeći korak: ${f.action}`);
    L.push(`Nositelj: ${f.owner}${f.deadline ? ` · Rok: ${f.deadline}` : ""}`);
    if (f.legal) L.push(`Uporište: ${f.legal}`);
    if (f.fine) L.push(`Kazna: ${f.fine}`);
    L.push("");
  }

  const h = buildHandoff(a.findings);
  if (h.knjigovoda.length) {
    L.push("PITANJA ZA KNJIGOVOĐU");
    h.knjigovoda.forEach((q) => L.push(`– ${q}`));
    L.push("");
  }
  if (h.posrednik.length) {
    L.push("PITANJA ZA INFORMACIJSKOG POSREDNIKA");
    h.posrednik.forEach((q) => L.push(`– ${q}`));
    L.push("");
  }

  L.push("IZVORI");
  for (const s of Object.values(SOURCES)) L.push(`– ${s.label}: ${s.url}`);
  L.push("");
  L.push(
    "Ovo nije pravno ni porezno savjetovanje. Konačnu interpretaciju potvrđuje knjigovođa, informacijski posrednik ili Porezna uprava.",
  );
  if (url) {
    L.push("");
    L.push(`Izvještaj: ${url}`);
  }
  return L.join("\n");
}
