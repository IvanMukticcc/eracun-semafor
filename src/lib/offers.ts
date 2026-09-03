import type { Answers, Assessment } from "./rules/types";
import { isPravnaOsoba } from "./rules/engine";

/**
 * Koja se ponuda pokazuje kome.
 *
 * Pravilo: ponuda mora odgovarati nalazu. Nuditi audit od 99 € nekome tko nema
 * nijedan otvoreni korak je gubitak povjerenja koje je izvještaj upravo
 * stekao — a povjerenje je jedino što ovdje pretvara besplatno u plaćeno.
 */

export type ProductId = "audit" | "setup" | "monitor" | "partner";

export interface Offer {
  id: ProductId;
  name: string;
  priceCents: number;
  priceLabel: string;
  /** Kratko objašnjenje cijene, npr. "jednokratno". */
  priceNote: string;
  headline: string;
  promise: string;
  includes: string[];
  cta: string;
}

export const OFFERS: Record<ProductId, Offer> = {
  audit: {
    id: "audit",
    name: "Workflow audit",
    priceCents: 9900,
    priceLabel: "99 €",
    priceNote: "jednokratno, bez pretplate",
    headline: "Zatvorimo kritične nalaze zajedno",
    promise:
      "Prolazimo kroz vaš stvarni proces i zatvaramo svaki otvoreni korak iz izvještaja, dok ne ostane nijedan crveni.",
    includes: [
      "Razgovor od 30 minuta u kojem prolazimo vaš stvarni tok računa",
      "Mapiranje vaših stavaka na KPD 2025, sa spornima izdvojenima za knjigovođu",
      "Provjera ovlaštenja, adrese u AMS-u i kanala za razmjenu",
      "Pisani popis pitanja za knjigovođu i posrednika, s odgovorima koje ste dobili",
      "Mjesečni postupak s imenovanim nositeljem i zamjenom",
      "Ponovna provjera nakon provedbe — da vidite zeleno",
    ],
    cta: "Zatraži audit",
  },
  setup: {
    id: "setup",
    name: "Assisted setup",
    priceCents: 34900,
    priceLabel: "349 €",
    priceNote: "jednokratno",
    headline: "Ne samo popis koraka, nego i provedba",
    promise:
      "Sve iz audita, plus zajedno postavljamo kanal, ovlaštenja i mjesečni postupak dok ne proradi na stvarnom računu.",
    includes: [
      "Sve iz audita",
      "Zajedničko postavljanje posrednika ili MikroeRačuna",
      "Potvrda ovlaštenja u FiskAplikaciji i adrese u AMS-u",
      "Test na jednom stvarnom računu, od izdavanja do fiskalizacije",
      "Predaja knjigovođi s pisanom podjelom odgovornosti",
      "Dva tjedna podrške na pitanja koja iskrsnu",
    ],
    cta: "Zatraži setup paket",
  },
  monitor: {
    id: "monitor",
    name: "Monitor promjena",
    priceCents: 2900,
    priceLabel: "29 €",
    priceNote: "mjesečno, otkazivo bilo kad",
    headline: "Da ne morate pratiti propis sami",
    promise:
      "Javim vam kad se promijeni nešto što se tiče baš vašeg slučaja, i što konkretno trebate napraviti.",
    includes: [
      "Obavijest kad se promijeni propis koji se odnosi na vaš profil",
      "Podsjetnik za eIzvještavanje prije 20. u mjesecu",
      "Ponovna provjera spremnosti svaka tri mjeseca",
      "Odgovor na kratko pitanje e-mailom, bez naplate po satu",
    ],
    cta: "Uključi monitor",
  },
  partner: {
    id: "partner",
    name: "Partnerski program",
    priceCents: 0,
    priceLabel: "po dogovoru",
    priceNote: "ovisi o broju klijenata",
    headline: "Provjera za sve vaše klijente odjednom",
    promise:
      "Umjesto da svakom klijentu objašnjavate isto, dobiju provjeru s vašim potpisom i dođu vam s konkretnim pitanjima.",
    includes: [
      "Provjera za sve klijente, s pregledom tko je crven a tko zelen",
      "Izvještaji s vašim imenom i kontaktom",
      "Popis klijenata kojima obveza zaprimanja već teče, poredan po riziku",
      "Skupna priprema za 1.1.2027. umjesto sto pojedinačnih razgovora",
    ],
    cta: "Javi mi se o partnerstvu",
  },
};

export interface Recommendation {
  primary: Offer;
  /** Alternativa uz glavnu ponudu; izostaje kad bi samo odvlačila pažnju. */
  secondary: Offer | null;
  /** Ton kojim se ponuda uvodi — izvodi se iz nalaza, ne iz želje da se proda. */
  tone: "hitno" | "popravak" | "odrzavanje";
  reason: string;
}

export function recommend(assessment: Assessment, answers: Answers): Recommendation {
  const { counts } = assessment;

  // Veći obveznici imaju više koraka i manje vremena; njima setup ima smisla
  // ponuditi odmah, a ne tek kao naknadni upsell.
  const larger =
    answers.volume === "51-200" ||
    answers.volume === "200+" ||
    isPravnaOsoba(answers.legalForm);

  if (counts.kriticno > 0) {
    return {
      primary: OFFERS.audit,
      secondary: larger ? OFFERS.setup : OFFERS.monitor,
      tone: "hitno",
      reason:
        counts.kriticno === 1
          ? "Jedan nalaz je kritičan — obveza koja već teče, a nije ispunjena."
          : `${counts.kriticno} nalaza su kritična — obveze koje već teku, a nisu ispunjene.`,
    };
  }

  if (counts.rizik > 0) {
    return {
      primary: OFFERS.audit,
      secondary: OFFERS.monitor,
      tone: "popravak",
      reason:
        "Nema propusta koji već traje, ali nekoliko koraka nije pouzdano — probit će se prvi put kad zapne.",
    };
  }

  return {
    primary: OFFERS.monitor,
    secondary: null,
    tone: "odrzavanje",
    reason:
      "Nemate otvorenih koraka. Audit vam sada ne treba i ne bih ga naplatio — jedino što ima smisla je da ne morate sami pratiti promjene.",
  };
}
