/**
 * Domenski tipovi za eRačun provjeru spremnosti.
 *
 * Sva pravila se izvode iz `briefs/fiskalizacija-2-0-cinjenice.md`, koji je
 * provjeren prema primarnim izvorima (Porezna uprava, NN 89/2025) 2026-09-03.
 */

export type Severity = "kriticno" | "rizik" | "provjeri" | "ok";

export type Area =
  | "opseg"
  | "zaprimanje"
  | "izdavanje"
  | "fiskalizacija"
  | "posrednik"
  | "ams"
  | "kpd"
  | "eizvjestavanje"
  | "proces";

export type Owner =
  | "Vi"
  | "Knjigovođa"
  | "Informacijski posrednik"
  | "Vi + knjigovođa"
  | "Vi + posrednik";

export interface Finding {
  id: string;
  area: Area;
  severity: Severity;
  /** Naslov nalaza — kratak, u drugom licu. */
  title: string;
  /** Što se konkretno odnosi na ovog obveznika. */
  what: string;
  /** Zašto je bitno — posljedica, ne teorija. */
  why?: string;
  /** Konkretan sljedeći korak. */
  action: string;
  owner: Owner;
  /** Rok, ako postoji. Slobodan tekst jer neki rokovi nisu datumi. */
  deadline?: string;
  /** Pravno uporište, npr. "NN 89/2025, čl. 48". */
  legal?: string;
  /** Raspon novčane kazne za ovaj prekršaj, već prilagođen pravnom obliku. */
  fine?: string;
  /** ID-evi iz `sources.ts`. */
  sources: string[];
}

export type LegalForm =
  | "obrt"
  | "doo"
  | "jdoo"
  | "slobodno-zanimanje"
  | "udruga"
  | "proracunski"
  | "ostalo";

export type YesNoUnknown = "da" | "ne" | "ne-znam";

export interface Answers {
  legalForm: LegalForm;
  vat: YesNoUnknown;
  sellsTo: Array<"b2b" | "b2g" | "b2c" | "inozemstvo">;
  receivesFromBusinesses: YesNoUnknown;
  invoicingTool: "program" | "excel-word" | "rucno" | "knjigovoda" | "ne-izdajem";
  intermediary: "imam" | "mikroeracun" | "nemam" | "ne-znam";
  ams: "potvrdio" | "nisam" | "ne-znam";
  fiscalizeIncoming: "da-u-roku" | "da-ali-kasnim" | "ne" | "ne-znam-sto-je";
  kpd: "da-sve" | "djelomicno" | "ne" | "ne-znam";
  rejections: YesNoUnknown;
  eIzvjestavanje: "da-sam" | "knjigovoda" | "ne" | "ne-znam";
  owner: "ja" | "zaposlenik" | "knjigovoda" | "nitko";
  volume: "0-10" | "11-50" | "51-200" | "200+";
}

/** Izvedeni profil obveznika — činjenično stanje prije ocjenjivanja. */
export interface Profile {
  /** Je li uopće obveznik prema Zakonu. */
  isObliged: boolean;
  /** Ne možemo utvrditi obvezu bez dodatnog podatka. */
  isIndeterminate: boolean;
  /** Datum od kojeg mora zaprimati i fiskalizirati, ISO. */
  receiveFrom: string | null;
  /** Datum od kojeg mora izdavati i fiskalizirati, ISO. */
  issueFrom: string | null;
  /** Ljudski čitljiva kategorija. */
  categoryLabel: string;
  /** Je li obveza zaprimanja već na snazi na dan provjere. */
  receivingActive: boolean;
  /** Je li obveza izdavanja već na snazi na dan provjere. */
  issuingActive: boolean;
  /** Dana do početka obveze izdavanja; 0 ako je već aktivna. */
  daysToIssue: number;
  /** Izdaje li ikome kome se eRačun uopće izdaje (B2B ili B2G). */
  hasEInvoiceCounterparties: boolean;
}

export interface Assessment {
  profile: Profile;
  findings: Finding[];
  /** 0–100. Nije ocjena kvalitete nego pokrivenost obveza. */
  score: number;
  overall: Severity;
  counts: Record<Severity, number>;
  /** Dan na koji je provjera napravljena, ISO. */
  assessedOn: string;
}
