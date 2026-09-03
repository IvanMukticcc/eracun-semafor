/**
 * Katalog primarnih izvora. Svaki nalaz mora citirati barem jedan.
 *
 * `checkedOn` je dan kad je tvrdnja zadnji put provjerena prema izvoru.
 * Ako se izvor promijeni, mijenja se i ovdje — ne u tekstu nalaza.
 */

export interface Source {
  id: string;
  label: string;
  url: string;
  /** ISO datum zadnje provjere sadržaja. */
  checkedOn: string;
  /** Datum ažuriranja koji sam izvor navodi, ako ga navodi. */
  publisherUpdated?: string;
}

export const SOURCES: Record<string, Source> = {
  "pu-eracun": {
    id: "pu-eracun",
    label: "Porezna uprava — eRačun",
    url: "https://porezna.gov.hr/fiskalizacija/bezgotovinski-racuni/eracun",
    checkedOn: "2026-09-03",
  },
  "pu-izdavatelji": {
    id: "pu-izdavatelji",
    label: "Porezna uprava — Izdavatelji i primatelji eRačuna te obveza izdavanja",
    url: "https://porezna-uprava.gov.hr/hr/izdavatelji-i-primatelji-eracuna-te-obveza-izdavanja-eracuna-azurirano-7-11-2025/8048",
    checkedOn: "2026-09-03",
    publisherUpdated: "2026-04-17",
  },
  "pu-fiskalizacija": {
    id: "pu-fiskalizacija",
    label: "Porezna uprava — Izdavanje i primanje eRačuna i fiskalizacija eRačuna",
    url: "https://porezna-uprava.gov.hr/hr/izdavanje-i-primanje-eracuna-i-fiskalizacija-eracuna/8047",
    checkedOn: "2026-09-03",
  },
  "nn-89-2025": {
    id: "nn-89-2025",
    label: "Zakon o fiskalizaciji, NN 89/2025",
    url: "https://narodne-novine.nn.hr/clanci/sluzbeni/full/2025_06_89_1233.html",
    checkedOn: "2026-09-03",
  },
  klasus: {
    id: "klasus",
    label: "KLASUS — pretraživanje KPD 2025, Državni zavod za statistiku",
    url: "https://klasus.dzs.hr/",
    checkedOn: "2026-09-03",
  },
};

export function source(id: string): Source {
  const found = SOURCES[id];
  if (!found) throw new Error(`Nepoznat izvor: ${id}`);
  return found;
}
