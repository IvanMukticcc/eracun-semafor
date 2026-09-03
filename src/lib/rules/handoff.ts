import type { Finding } from "./types";

/**
 * Nalaz govori vlasniku što nije riješeno. Ovaj sloj to pretvara u poruku koju
 * vlasnik može doslovno poslati knjigovođi ili posredniku.
 *
 * Namjerno je odvojen od enginea: engine utvrđuje usklađenost, ovo je
 * komunikacija. Mijenja se češće i ne smije moći pokvariti ocjenu.
 */

type Recipient = "knjigovoda" | "posrednik";

const ASKS: Record<string, Partial<Record<Recipient, string[]>>> = {
  "opseg-pdv-nepoznat": {
    knjigovoda: ["Jesmo li upisani u registar obveznika PDV-a? Molim pisanu potvrdu."],
  },
  "opseg-udruga": {
    knjigovoda: [
      "Obavljamo li gospodarsku djelatnost zbog koje smo obveznik poreza na dobit ili PDV-a?",
    ],
  },
  "zaprimanje-obveza-aktivna": {
    knjigovoda: [
      "Možemo li proći ulazne račune od 1.1.2026. naovamo i utvrditi je li nam neki eRačun trebao stići, a nije?",
    ],
  },
  "fiskalizacija-primljeni": {
    posrednik: [
      "Provodi li se fiskalizacija primljenog eRačuna automatski ili je moramo pokrenuti mi?",
      "Gdje vidimo koji primljeni eRačuni još nisu fiskalizirani?",
    ],
  },
  "fiskalizacija-izdani": {
    posrednik: [
      "Provodi li se fiskalizacija izdanog eRačuna u trenutku izdavanja, automatski?",
    ],
  },
  "posrednik-ne-znam": {
    knjigovoda: [
      "Koji je naš informacijski posrednik i je li ovlaštenje potvrđeno u FiskAplikaciji?",
    ],
  },
  "posrednik-odgovornost": {
    posrednik: [
      "Molim popis koraka koje vaše rješenje radi automatski: fiskalizacija izdanih, fiskalizacija primljenih, eIzvještavanje odbijanja, eIzvještavanje naplate.",
    ],
  },
  "ams-nije-potvrden": {
    posrednik: [
      "Je li naša adresa za zaprimanje potvrđena u adresaru (AMS)? Molim potvrdu statusa.",
    ],
  },
  "kpd-mapiranje": {
    knjigovoda: [
      "Šaljem popis naših usluga i proizvoda s predloženim KPD 2025 oznakama. Molim potvrdu spornih stavaka.",
    ],
  },
  "eizvjestavanje-rokovi": {
    knjigovoda: [
      "Radite li za nas eIzvještavanje odbijenih eRačuna do 20. u mjesecu?",
      "Radite li za nas eIzvještavanje naplate do 20. u mjesecu?",
    ],
  },
  "odbijanja-vidljivost": {
    posrednik: [
      "Možete li poslati izvještaj statusa svih izdanih eRačuna za zadnja tri mjeseca, s razlozima odbijanja?",
    ],
  },
  "proces-knjigovoda-granice": {
    knjigovoda: [
      "Molim potvrdu radite li ova četiri koraka: fiskalizacija primljenih eRačuna u roku od 5 radnih dana, fiskalizacija izdanih, eIzvještavanje odbijanja, eIzvještavanje naplate.",
      "Ako neki od tih koraka ne radite, koji od njih ostaje na nama?",
    ],
  },
  "proces-automatizacija": {
    posrednik: [
      "Postoji li mjesečni izvještaj statusa svih eRačuna koji možemo dobiti automatski?",
    ],
  },
  "proces-alat-nije-eracun": {
    knjigovoda: [
      "Koje smo račune od 1.1.2026. izdali izvan sustava eRačuna i kako to ispravljamo?",
    ],
  },
};

export interface Handoff {
  knjigovoda: string[];
  posrednik: string[];
}

export function buildHandoff(findings: Finding[]): Handoff {
  const out: Handoff = { knjigovoda: [], posrednik: [] };
  for (const f of findings) {
    // Uredni nalazi ne generiraju pitanja — nema se što pitati.
    if (f.severity === "ok") continue;
    const entry = ASKS[f.id];
    if (!entry) continue;
    for (const q of entry.knjigovoda ?? []) if (!out.knjigovoda.includes(q)) out.knjigovoda.push(q);
    for (const q of entry.posrednik ?? []) if (!out.posrednik.includes(q)) out.posrednik.push(q);
  }
  return out;
}

/** Za test: svaki id u mapi mora odgovarati stvarnom nalazu iz enginea. */
export const HANDOFF_FINDING_IDS = Object.keys(ASKS);
