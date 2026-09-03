/**
 * Mjerenje lijevka.
 *
 * Hipoteze i pragovi dolaze iz `briefs/2026-09-03-monetizacija.md`, odjeljak 4.
 * Rasponi su **pretpostavke, ne podaci** — postoje da bi se mogli opovrgnuti,
 * pa se drže odvojeno od izmjerenog udjela i nikad se ne miješaju s njim.
 *
 * Logika stoji ovdje, a ne u `/ops`, iz istog razloga iz kojeg pravila stoje u
 * `rules/`: da se može testirati bez baze i bez preglednika. Ploča samo crta
 * ono što ove funkcije izračunaju.
 */

export type Stanje = "premalo" | "ispod" | "unutar" | "iznad";

export interface Metrika {
  id: string;
  naziv: string;
  /** Najmanji nazivnik ispod kojeg se ocjena ne donosi. */
  minUzorak: number;
  /** Granice hipoteze, u postotcima. */
  min: number;
  max: number;
  /** Što znači ako metrika ispadne izvan raspona. */
  akoPadne: string;
}

export interface Izmjereno extends Metrika {
  brojnik: number;
  nazivnik: number;
  /** Udio u postotcima; `null` kad je uzorak premalen da bi značio išta. */
  udio: number | null;
  stanje: Stanje;
}

/** Pet metrika iz monetizacije, redom kojim se kvare. */
export const METRIKE: Metrika[] = [
  {
    id: "provjera-prijava",
    naziv: "Provjera → prijava e-maila",
    minUzorak: 20,
    min: 15,
    max: 25,
    akoPadne: "Izvještaj ne stvara dovoljno povjerenja ili traži previše prerano.",
  },
  {
    id: "provjera-kriticno",
    naziv: "Provjera s kritičnim nalazom",
    minUzorak: 20,
    min: 50,
    max: 70,
    akoPadne:
      "Ako je nisko, meta je kriva. Ako je blizu 95 %, pravila su prestroga i gube vjerodostojnost.",
  },
  {
    id: "provjera-audit",
    naziv: "Provjera → zahtjev za audit",
    minUzorak: 20,
    min: 3,
    max: 6,
    akoPadne: "Ponuda ne odgovara nalazu, ili je cijena kriva.",
  },
  {
    id: "zahtjev-placeno",
    naziv: "Zahtjev → plaćeno",
    minUzorak: 10,
    min: 40,
    max: 60,
    akoPadne: "Uvodni razgovor ne zatvara, ili dolaze nekvalificirani.",
  },
  {
    id: "audit-setup",
    naziv: "Audit → setup",
    minUzorak: 5,
    min: 20,
    max: 30,
    akoPadne: "Audit rješava previše sam po sebi, pa nema što nadograditi.",
  },
];

/**
 * Ocjenjuje jednu metriku. Ispod praga uzorka namjerno ne vraća udio —
 * postotak iz tri mjerenja nije podatak nego dojam, a cijela je poanta ploče
 * da se hipoteze mogu pošteno opovrgnuti.
 */
export function izmjeri(metrika: Metrika, brojnik: number, nazivnik: number): Izmjereno {
  const dovoljno = nazivnik >= metrika.minUzorak && nazivnik > 0;
  if (!dovoljno) {
    return { ...metrika, brojnik, nazivnik, udio: null, stanje: "premalo" };
  }

  const udio = (brojnik / nazivnik) * 100;
  const stanje: Stanje = udio < metrika.min ? "ispod" : udio > metrika.max ? "iznad" : "unutar";
  return { ...metrika, brojnik, nazivnik, udio, stanje };
}

export interface Brojevi {
  provjere: number;
  provjereKriticne: number;
  provjereUredne: number;
  prijave: number;
  zahtjevi: number;
  zahtjeviAudit: number;
  placeniSvi: number;
  placeniAuditi: number;
  placeniSetupi: number;
}

/** Cijeli lijevak iz sirovih brojeva, redoslijedom iz `METRIKE`. */
export function lijevak(b: Brojevi): Izmjereno[] {
  const parovi: Record<string, [number, number]> = {
    "provjera-prijava": [b.prijave, b.provjere],
    "provjera-kriticno": [b.provjereKriticne, b.provjere],
    "provjera-audit": [b.zahtjeviAudit, b.provjere],
    "zahtjev-placeno": [b.placeniSvi, b.zahtjevi],
    "audit-setup": [b.placeniSetupi, b.placeniAuditi],
  };
  return METRIKE.map((m) => izmjeri(m, ...parovi[m.id]));
}

/** Prag ispod kojeg udio urednih provjera potvrđuje da klin postoji. */
export const KRITICNI_TEST_PRAG = 20;

export interface KriticniTest {
  udio: number | null;
  /** `null` dok uzorak nije dovoljan za sud. */
  prolazi: boolean | null;
}

/**
 * Kritični test iz monetizacije, prije svih ostalih metrika: koliki je udio
 * provjera koje izađu potpuno uredne. Ako je visok, klin ne postoji kako je
 * zamišljen — alat namjerno urednom obvezniku kaže da nema otvorenih koraka i
 * odbija naplatu, pa je taj udio pošten pokazatelj, a ne posljedica blagih
 * pravila.
 */
export function kriticniTest(uredne: number, provjere: number): KriticniTest {
  if (provjere < 20) return { udio: null, prolazi: null };
  const udio = (uredne / provjere) * 100;
  return { udio, prolazi: udio < KRITICNI_TEST_PRAG };
}
