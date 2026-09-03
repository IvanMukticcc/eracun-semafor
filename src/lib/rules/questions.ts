import type { Answers } from "./types";

/**
 * Pitanja su namjerno na jeziku vlasnika obrta, ne na jeziku Zakona.
 * Svako pitanje ima "ne znam" gdje neznanje samo po sebi nosi rizik —
 * jer "ne znam" je nalaz, ne rupa u podacima.
 */

export interface Choice<K extends keyof Answers = keyof Answers> {
  value: Answers[K] extends Array<infer U> ? U : Answers[K];
  label: string;
  hint?: string;
}

export interface Question<K extends keyof Answers = keyof Answers> {
  id: K;
  /** Kratki naziv koraka u traci napretka. */
  step: string;
  title: string;
  help?: string;
  multi?: boolean;
  choices: Choice<K>[];
  /** Ako vrati false, pitanje se preskače i odgovor ostaje neodabran. */
  when?: (a: Partial<Answers>) => boolean;
}

const isObligedish = (a: Partial<Answers>) =>
  a.legalForm !== undefined && a.legalForm !== "ostalo";

export const QUESTIONS: Question[] = [
  {
    id: "legalForm",
    step: "Oblik",
    title: "Koji je pravni oblik vašeg poslovanja?",
    help: "Od ovoga ovisi koje se obveze i koji rokovi uopće odnose na vas.",
    choices: [
      { value: "obrt", label: "Obrt", hint: "paušalni ili na poslovne knjige" },
      { value: "doo", label: "d.o.o." },
      { value: "jdoo", label: "j.d.o.o." },
      { value: "slobodno-zanimanje", label: "Slobodno zanimanje", hint: "samostalna djelatnost" },
      { value: "udruga", label: "Udruga ili neprofitna organizacija" },
      { value: "proracunski", label: "Proračunski ili izvanproračunski korisnik" },
      { value: "ostalo", label: "Nešto drugo" },
    ] as Choice<"legalForm">[],
  } as Question<"legalForm">,
  {
    id: "vat",
    step: "PDV",
    title: "Jeste li u sustavu PDV-a?",
    help: "Ovo je jedina najvažnija stavka. Dijeli obveznike na one koji su u punoj obvezi od 1.1.2026. i one kojima obveza izdavanja počinje 1.1.2027.",
    choices: [
      { value: "da", label: "Da, u registru smo obveznika PDV-a" },
      { value: "ne", label: "Ne, nismo u sustavu PDV-a" },
      { value: "ne-znam", label: "Ne znam" },
    ] as Choice<"vat">[],
  } as Question<"vat">,
  {
    id: "sellsTo",
    step: "Kupci",
    title: "Kome izdajete račune?",
    help: "Odaberite sve što vrijedi. Fiskalizacija 2.0 ne pokriva sve tipove kupaca jednako.",
    multi: true,
    choices: [
      { value: "b2b", label: "Firmama i obrtima u Hrvatskoj" },
      { value: "b2g", label: "Državi, gradu, općini, javnim ustanovama" },
      { value: "b2c", label: "Građanima (krajnjim potrošačima)" },
      { value: "inozemstvo", label: "Kupcima izvan Hrvatske" },
    ] as Choice<"sellsTo">[],
    when: isObligedish,
  } as Question<"sellsTo">,
  {
    id: "receivesFromBusinesses",
    step: "Ulazni",
    title: "Primate li račune od drugih firmi ili obrta iz Hrvatske?",
    help: "Npr. dobavljači, alati, najam, telekom, knjigovodstvo, gorivo.",
    choices: [
      { value: "da", label: "Da" },
      { value: "ne", label: "Ne" },
      { value: "ne-znam", label: "Ne znam" },
    ] as Choice<"receivesFromBusinesses">[],
    when: isObligedish,
  } as Question<"receivesFromBusinesses">,
  {
    id: "invoicingTool",
    step: "Alat",
    title: "Kako danas izdajete račune?",
    choices: [
      { value: "program", label: "Kroz program ili web aplikaciju za račune" },
      { value: "excel-word", label: "Excel ili Word predložak" },
      { value: "rucno", label: "Ručno, blok ili PDF" },
      { value: "knjigovoda", label: "Knjigovođa ih izdaje umjesto mene" },
      { value: "ne-izdajem", label: "Trenutno ne izdajem račune" },
    ] as Choice<"invoicingTool">[],
    when: isObligedish,
  } as Question<"invoicingTool">,
  {
    id: "intermediary",
    step: "Posrednik",
    title: "Preko čega razmjenjujete eRačune?",
    help: "Informacijski posrednik je tvrtka s liste Porezne uprave koja šalje i prima eRačune umjesto vas. MikroeRačun je besplatna aplikacija Porezne unutar ePorezne.",
    choices: [
      { value: "imam", label: "Imam informacijskog posrednika" },
      { value: "mikroeracun", label: "Koristim MikroeRačun" },
      { value: "nemam", label: "Nemam ništa od toga" },
      { value: "ne-znam", label: "Ne znam / knjigovođa je to riješio" },
    ] as Choice<"intermediary">[],
    when: isObligedish,
  } as Question<"intermediary">,
  {
    id: "ams",
    step: "Adresa",
    title: "Je li vaša adresa za primanje eRačuna potvrđena u adresaru (AMS)?",
    help: "Bez potvrđene adrese vas izdavatelj ne može pronaći i eRačun vam ne može stići.",
    choices: [
      { value: "potvrdio", label: "Da, potvrđena je" },
      { value: "nisam", label: "Ne, nije" },
      { value: "ne-znam", label: "Ne znam što je to" },
    ] as Choice<"ams">[],
    when: isObligedish,
  } as Question<"ams">,
  {
    id: "fiscalizeIncoming",
    step: "Fiskalizacija",
    title: "Fiskalizirate li primljene eRačune u roku od 5 radnih dana?",
    help: "Fiskalizacija primljenog eRačuna je zaseban korak od samog primanja. Rok je pet radnih dana od primitka.",
    choices: [
      { value: "da-u-roku", label: "Da, redovito unutar roka" },
      { value: "da-ali-kasnim", label: "Radim to, ali ne uvijek na vrijeme" },
      { value: "ne", label: "Ne radim to" },
      { value: "ne-znam-sto-je", label: "Nisam znao da to moram" },
    ] as Choice<"fiscalizeIncoming">[],
    when: isObligedish,
  } as Question<"fiscalizeIncoming">,
  {
    id: "kpd",
    step: "KPD",
    title: "Jesu li vaše usluge i proizvodi mapirani na KPD 2025?",
    help: "Svaka stavka na eRačunu mora nositi šesteroznamenkastu klasifikacijsku oznaku.",
    choices: [
      { value: "da-sve", label: "Da, sve stavke imaju oznaku" },
      { value: "djelomicno", label: "Djelomično" },
      { value: "ne", label: "Ne" },
      { value: "ne-znam", label: "Ne znam što je KPD" },
    ] as Choice<"kpd">[],
    when: isObligedish,
  } as Question<"kpd">,
  {
    id: "rejections",
    step: "Odbijanja",
    title: "Je li vam se dogodilo da je eRačun odbijen?",
    help: "Vaš odbijeni izlazni račun ili račun koji ste vi odbili.",
    choices: [
      { value: "da", label: "Da" },
      { value: "ne", label: "Ne" },
      { value: "ne-znam", label: "Ne znam" },
    ] as Choice<"rejections">[],
    when: isObligedish,
  } as Question<"rejections">,
  {
    id: "eIzvjestavanje",
    step: "eIzvještavanje",
    title: "Prijavljujete li odbijanja i naplatu kroz eIzvještavanje do 20. u mjesecu?",
    help: "Za prethodni mjesec. Odnosi se na podatke o odbijenim računima i o naplati.",
    choices: [
      { value: "da-sam", label: "Da, radimo to sami" },
      { value: "knjigovoda", label: "Knjigovođa to radi" },
      { value: "ne", label: "Ne radimo to" },
      { value: "ne-znam", label: "Ne znam" },
    ] as Choice<"eIzvjestavanje">[],
    when: isObligedish,
  } as Question<"eIzvjestavanje">,
  {
    id: "owner",
    step: "Odgovornost",
    title: "Tko kod vas operativno šalje i prima eRačune?",
    help: "Ne tko je pravno odgovoran, nego tko stvarno klikne.",
    choices: [
      { value: "ja", label: "Ja osobno" },
      { value: "zaposlenik", label: "Zaposlenik ili suradnik" },
      { value: "knjigovoda", label: "Knjigovođa" },
      { value: "nitko", label: "Nije nitko konkretno zadužen" },
    ] as Choice<"owner">[],
    when: isObligedish,
  } as Question<"owner">,
  {
    id: "volume",
    step: "Opseg",
    title: "Koliko izlaznih računa izdate mjesečno?",
    choices: [
      { value: "0-10", label: "Do 10" },
      { value: "11-50", label: "11 do 50" },
      { value: "51-200", label: "51 do 200" },
      { value: "200+", label: "Više od 200" },
    ] as Choice<"volume">[],
    when: isObligedish,
  } as Question<"volume">,
];

/** Pitanja koja su relevantna za trenutno stanje odgovora. */
export function visibleQuestions(answers: Partial<Answers>): Question[] {
  return QUESTIONS.filter((q) => (q.when ? q.when(answers) : true));
}

/**
 * Neutralne vrijednosti za pitanja koja se preskoče. Namjerno su sve "ne znam"
 * ili najmanje tvrdeće opcije — preskočeno pitanje nikad ne smije proći kao
 * potvrda da je nešto riješeno.
 */
export const NEUTRAL_ANSWERS: Answers = {
  legalForm: "ostalo",
  vat: "ne-znam",
  sellsTo: [],
  receivesFromBusinesses: "ne-znam",
  invoicingTool: "ne-izdajem",
  intermediary: "ne-znam",
  ams: "ne-znam",
  fiscalizeIncoming: "ne-znam-sto-je",
  kpd: "ne-znam",
  rejections: "ne-znam",
  eIzvjestavanje: "ne-znam",
  owner: "nitko",
  volume: "0-10",
};

/** Dopunjava djelomične odgovore neutralnima da izvještaj uvijek ima puni ulaz. */
export function completeAnswers(partial: Partial<Answers>): Answers {
  return { ...NEUTRAL_ANSWERS, ...partial };
}
