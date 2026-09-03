import type {
  Answers,
  Assessment,
  Finding,
  LegalForm,
  Profile,
  Severity,
} from "./types";

/**
 * Deterministički engine. Bez modela, bez nagađanja.
 * Isti odgovori uvijek daju isti nalaz — to je uvjet da se rezultat
 * može braniti pred knjigovođom i pred Poreznom.
 *
 * Činjenična podloga: briefs/fiskalizacija-2-0-cinjenice.md (provjereno 2026-09-03).
 */

const ERACUN_2026 = "2026-01-01";
const ERACUN_2027 = "2027-01-01";

/** Pravna osoba vs. obrt/samostalna djelatnost — raspon kazne se razlikuje. */
function isPravnaOsoba(form: LegalForm): boolean {
  return form === "doo" || form === "jdoo" || form === "udruga" || form === "proracunski";
}

type FineArticle = "71" | "72" | "73";

const FINES: Record<FineArticle, { pravna: string; obrt: string; what: string }> = {
  "71": {
    pravna: "3.980 – 66.360 € za pravnu osobu, 660 – 6.630 € za odgovornu osobu",
    obrt: "3.980 – 39.810 €",
    what: "neizdavanje ili nezaprimanje eRačuna",
  },
  "72": {
    pravna: "2.650 – 66.360 € za pravnu osobu, 390 – 6.630 € za odgovornu osobu",
    obrt: "1.320 – 39.810 €",
    what: "neprovođenje fiskalizacije",
  },
  "73": {
    pravna: "1.320 – 26.540 € za pravnu osobu, 260 – 2.650 € za odgovornu osobu",
    obrt: "660 – 13.270 €",
    what: "nedostajući podaci ili kasno izvještavanje",
  },
};

function fineFor(form: LegalForm, article: FineArticle): string {
  const f = FINES[article];
  return `${isPravnaOsoba(form) ? f.pravna : f.obrt} (čl. ${article}, ${f.what})`;
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISO}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

export function buildProfile(a: Answers, today: string): Profile {
  const hasEInvoiceCounterparties =
    a.sellsTo.includes("b2b") || a.sellsTo.includes("b2g");

  // Proračunski korisnici su u punoj obvezi od 1.1.2026. neovisno o PDV statusu.
  if (a.legalForm === "proracunski") {
    return finish(true, false, ERACUN_2026, ERACUN_2026, "Proračunski ili izvanproračunski korisnik");
  }

  // Oblik izvan obuhvata ima prednost: bez poznatog oblika ne smijemo tvrditi
  // da obveza postoji, ni kad je PDV status poznat.
  if (a.legalForm === "ostalo") {
    return finish(false, true, null, null, "Oblik izvan obuhvata upitnika");
  }

  // PDV status ne znamo — obveza se ne može utvrditi, a to je samo po sebi nalaz.
  if (a.vat === "ne-znam") {
    return finish(true, true, ERACUN_2026, null, "Nije utvrđeno — nedostaje PDV status");
  }

  if (a.vat === "da") {
    return finish(true, false, ERACUN_2026, ERACUN_2026, "Obveznik PDV-a sa sjedištem u RH");
  }

  // Neobveznik PDV-a.
  if (a.legalForm === "udruga") {
    // Udruga je obveznik samo ako obavlja gospodarsku djelatnost koja je uvodi
    // u PDV ili u porez na dobit. To se ne može utvrditi iz upitnika.
    return finish(true, true, ERACUN_2026, ERACUN_2027, "Udruga izvan sustava PDV-a — status treba utvrditi");
  }

  return finish(
    true,
    false,
    ERACUN_2026,
    ERACUN_2027,
    "Neobveznik PDV-a — obveznik poreza na dohodak ili dobit",
  );

  function finish(
    isObliged: boolean,
    isIndeterminate: boolean,
    receiveFrom: string | null,
    issueFrom: string | null,
    categoryLabel: string,
  ): Profile {
    return {
      isObliged,
      isIndeterminate,
      receiveFrom,
      issueFrom,
      categoryLabel,
      receivingActive: receiveFrom !== null && daysBetween(receiveFrom, today) >= 0,
      issuingActive: issueFrom !== null && daysBetween(issueFrom, today) >= 0,
      daysToIssue: issueFrom === null ? 0 : Math.max(0, daysBetween(today, issueFrom)),
      hasEInvoiceCounterparties,
    };
  }
}

export function evaluate(a: Answers, today: string): Assessment {
  const profile = buildProfile(a, today);
  const f: Finding[] = [];

  // ────────────────────────────── OPSEG OBVEZE ──────────────────────────────

  if (a.vat === "ne-znam") {
    f.push({
      id: "opseg-pdv-nepoznat",
      area: "opseg",
      severity: "kriticno",
      title: "PDV status nije utvrđen, a o njemu ovisi sve ostalo",
      what: "Bez podatka jeste li u registru obveznika PDV-a nije moguće utvrditi jeste li u punoj obvezi od 1.1.2026. ili vam obveza izdavanja počinje 1.1.2027.",
      why: "Ako ste u sustavu PDV-a, obveza izdavanja eRačuna traje već osam mjeseci i svaki izdani račun koji nije eRačun je prekršaj.",
      action: "Provjerite PDV status u ePoreznoj ili kod knjigovođe prije bilo kojeg drugog koraka.",
      owner: "Vi + knjigovođa",
      deadline: "Odmah",
      legal: "NN 89/2025, čl. 38",
      sources: ["pu-izdavatelji", "nn-89-2025"],
    });
  }

  if (a.legalForm === "udruga" && a.vat === "ne") {
    f.push({
      id: "opseg-udruga",
      area: "opseg",
      severity: "provjeri",
      title: "Za udrugu obveza ovisi o gospodarskoj djelatnosti",
      what: "Udruge i neprofitne organizacije nisu obveznici osim ako obavljaju gospodarsku djelatnost zbog koje ulaze u sustav PDV-a ili postaju obveznici poreza na dobit.",
      action: "Utvrdite s knjigovođom jeste li obveznik poreza na dobit. Ako jeste, na vas se primjenjuju ista pravila kao na trgovačko društvo.",
      owner: "Knjigovođa",
      legal: "NN 89/2025, čl. 38",
      sources: ["pu-izdavatelji"],
    });
  }

  if (a.legalForm === "ostalo") {
    f.push({
      id: "opseg-izvan-obuhvata",
      area: "opseg",
      severity: "provjeri",
      title: "Vaš oblik nije pokriven ovim upitnikom",
      what: "Upitnik pokriva obrte, trgovačka društva, slobodna zanimanja, udruge i proračunske korisnike.",
      action: "Zatražite pojedinačnu provjeru — status treba utvrditi ručno prema čl. 38.",
      owner: "Vi",
      legal: "NN 89/2025, čl. 38",
      sources: ["pu-izdavatelji"],
    });
  }

  if (profile.isObliged && a.vat === "da") {
    f.push({
      id: "opseg-pdv-puna-obveza",
      area: "opseg",
      severity: "ok",
      title: "U punoj ste obvezi od 1.1.2026.",
      what: "Kao obveznik PDV-a sa sjedištem u RH dužni ste izdavati, zaprimati i fiskalizirati eRačune za tuzemne B2B i B2G transakcije.",
      action: "Ostatak izvještaja provjerava izvršavate li tu obvezu u praksi, a ne samo na papiru.",
      owner: "Vi",
      deadline: "Na snazi od 1.1.2026.",
      legal: "NN 89/2025, čl. 38, čl. 41, čl. 80",
      sources: ["pu-izdavatelji", "nn-89-2025"],
    });
  }

  if (profile.isObliged && a.vat === "ne" && a.legalForm !== "proracunski" && a.legalForm !== "ostalo") {
    f.push({
      id: "opseg-nepdv-2027",
      area: "opseg",
      severity: profile.daysToIssue <= 180 ? "rizik" : "provjeri",
      title: `Obveza izdavanja eRačuna počinje 1.1.2027. — ostalo je ${profile.daysToIssue} dana`,
      what: "Od 1.1.2027. i obveznici izvan sustava PDV-a moraju izdavati i fiskalizirati eRačune prema primateljima eRačuna. Obveza ne ovisi o broju izdanih računa, visini primitaka ni veličini obrta.",
      why: "Paušalni obrt koji izda samo nekoliko računa godišnje drugom poduzetniku također ulazi u obvezu. Kriterij je porezni položaj izdavatelja i primatelja, ne opseg posla.",
      action: "Do 1.1.2027. odaberite način razmjene, mapirajte stavke na KPD 2025 i testirajte izdavanje na jednom stvarnom računu.",
      owner: "Vi",
      deadline: "1.1.2027.",
      legal: "NN 89/2025, čl. 38, čl. 80",
      sources: ["pu-izdavatelji", "nn-89-2025"],
    });
  }

  if (profile.isObliged && !profile.hasEInvoiceCounterparties && a.sellsTo.length > 0) {
    f.push({
      id: "opseg-nema-b2b",
      area: "opseg",
      severity: "provjeri",
      title: "Izdajete samo građanima ili u inozemstvo — ali obveza zaprimanja i dalje vrijedi",
      what: "Za račune građanima (B2C) i inozemnim kupcima ne izdaje se eRačun prema Fiskalizaciji 2.0. To ne ukida vašu obvezu da zaprimate i fiskalizirate eRačune koje vama pošalju dobavljači.",
      why: "Ovo je najčešća pogrešna pretpostavka: „ne izdajem firmama, znači me se ne tiče.” Tiče vas se kao primatelja.",
      action: "Provjerite dio izvještaja o zaprimanju i fiskalizaciji ulaznih računa.",
      owner: "Vi",
      legal: "NN 89/2025, čl. 41",
      sources: ["pu-izdavatelji"],
    });
  }

  if (a.sellsTo.includes("b2c")) {
    f.push({
      id: "opseg-b2c",
      area: "opseg",
      severity: "ok",
      title: "Računi građanima idu po zasebnim pravilima",
      what: "B2C transakcije nisu obuhvaćene obvezom eRačuna. Za njih vrijede pravila fiskalizacije gotovinskih računa.",
      action: "Nemojte gasiti postojeći fiskalni proces za građane — on ostaje.",
      owner: "Vi",
      legal: "NN 89/2025, čl. 39",
      sources: ["pu-izdavatelji"],
    });
  }

  if (a.sellsTo.includes("inozemstvo")) {
    f.push({
      id: "opseg-inozemstvo",
      area: "opseg",
      severity: "ok",
      title: "Inozemni kupci nisu u obuhvatu",
      what: "Osobe bez sjedišta, prebivališta ili uobičajenog boravišta u RH ne smatraju se izdavateljima ni primateljima eRačuna prema Zakonu.",
      action: "Za te račune zadržite postojeći način izdavanja.",
      owner: "Vi",
      legal: "NN 89/2025, čl. 38",
      sources: ["pu-izdavatelji"],
    });
  }

  // ─────────────────────────────── ZAPRIMANJE ───────────────────────────────

  if (profile.receivingActive && a.receivesFromBusinesses !== "ne") {
    const blocked = a.intermediary === "nemam" || a.intermediary === "ne-znam";
    f.push({
      id: "zaprimanje-obveza-aktivna",
      area: "zaprimanje",
      severity: blocked ? "kriticno" : "ok",
      title: blocked
        ? "Obveza zaprimanja traje od 1.1.2026., a nemate potvrđen kanal"
        : "Obveza zaprimanja je aktivna i imate kanal",
      what:
        a.vat === "ne"
          ? "Iako obveza izdavanja za vas počinje tek 1.1.2027., obveza zaprimanja i fiskalizacije primljenih eRačuna vrijedi već od 1.1.2026."
          : "Dužni ste zaprimiti eRačun koji vam pošalje izdavatelj i fiskalizirati ga.",
      why: blocked
        ? "Ovo je najskuplji propust u cijelom izvještaju jer traje unatrag, a ne od trenutka kad ga primijetite."
        : undefined,
      action: blocked
        ? "Odaberite informacijskog posrednika ili aktivirajte MikroeRačun i potvrdite adresu u AMS-u. Zatim s knjigovođom prođite ulazne račune od 1.1.2026. naovamo."
        : "Provjerite da svaki ulazni eRačun stvarno dolazi na jedno mjesto i da netko po njemu postupa.",
      owner: blocked ? "Vi + knjigovođa" : "Vi",
      deadline: blocked ? "Odmah — obveza je već na snazi" : "Na snazi",
      legal: "NN 89/2025, čl. 41",
      fine: blocked ? fineFor(a.legalForm, "71") : undefined,
      sources: ["pu-izdavatelji", "nn-89-2025"],
    });
  }

  // ────────────────────────────── FISKALIZACIJA ─────────────────────────────

  if (profile.receivingActive && a.receivesFromBusinesses !== "ne") {
    const sev: Severity =
      a.fiscalizeIncoming === "da-u-roku"
        ? "ok"
        : a.fiscalizeIncoming === "da-ali-kasnim"
          ? "rizik"
          : "kriticno";
    f.push({
      id: "fiskalizacija-primljeni",
      area: "fiskalizacija",
      severity: sev,
      title:
        sev === "ok"
          ? "Fiskalizacija ulaznih eRačuna je u roku"
          : "Fiskalizacija primljenih eRačuna nije pod kontrolom",
      what: "Fiskalizacija primljenog eRačuna provodi se odvojeno od same razmjene, najkasnije pet radnih dana od primitka.",
      why:
        sev === "ok"
          ? undefined
          : "Fiskalizacija nije isto što i primanje računa. Račun može uredno stići i biti proknjižen, a da fiskalizacija nikad nije provedena — obveza tada nije ispunjena.",
      action:
        sev === "ok"
          ? "Zadržite postojeći ritam i definirajte tko preuzima kad je nositelj odsutan."
          : "Postavite fiksni tjedni termin za fiskalizaciju ulaznih računa i pisano potvrdite s posrednikom radi li se to automatski ili ručno.",
      owner: "Vi + posrednik",
      deadline: "5 radnih dana od primitka",
      legal: "NN 89/2025, čl. 48",
      fine: sev === "ok" ? undefined : fineFor(a.legalForm, "72"),
      sources: ["pu-fiskalizacija", "nn-89-2025"],
    });
  }

  if (profile.issuingActive && profile.hasEInvoiceCounterparties) {
    f.push({
      id: "fiskalizacija-izdani",
      area: "fiskalizacija",
      severity: "provjeri",
      title: "Izdani eRačun se fiskalizira u trenutku izdavanja",
      what: "Fiskalizacija izdanog eRačuna provodi se u trenutku izdavanja. Iznimka je samoizdavanje računa, gdje je rok pet radnih dana.",
      why: "Ako program šalje eRačun ali ne provodi fiskalizaciju, razmjena izgleda uspješno dok obveza nije ispunjena.",
      action: "Zatražite od posrednika ili dobavljača programa pisanu potvrdu da se fiskalizacija izdanog eRačuna provodi automatski.",
      owner: "Informacijski posrednik",
      deadline: "U trenutku izdavanja; 5 radnih dana kod samoizdavanja",
      legal: "NN 89/2025, čl. 48",
      fine: fineFor(a.legalForm, "72"),
      sources: ["pu-fiskalizacija", "nn-89-2025"],
    });
  }

  // ─────────────────────────────── POSREDNIK ────────────────────────────────

  if (profile.isObliged) {
    if (a.intermediary === "nemam") {
      f.push({
        id: "posrednik-nemam",
        area: "posrednik",
        severity: "kriticno",
        title: "Nemate kanal za razmjenu eRačuna",
        what: "Bez informacijskog posrednika ili MikroeRačuna ne možete ni primati ni slati eRačune. Rok za prijavu informacijskog posrednika bio je 31.12.2025.",
        action:
          a.vat === "ne"
            ? "Aktivirajte MikroeRačun unutar ePorezne — besplatan je i namijenjen obveznicima izvan sustava PDV-a."
            : "Odaberite informacijskog posrednika s liste Porezne uprave i prijavite ga kroz FiskAplikaciju.",
        owner: "Vi",
        deadline: "Odmah — rok je prošao 31.12.2025.",
        legal: "NN 89/2025, čl. 59–62",
        sources: ["pu-eracun", "pu-fiskalizacija"],
      });
    }

    if (a.intermediary === "ne-znam") {
      f.push({
        id: "posrednik-ne-znam",
        area: "posrednik",
        severity: "kriticno",
        title: "Ne znate preko čega se razmjenjuju vaši eRačuni",
        what: "Pretpostavka da je knjigovođa to riješio nije dokaz da jest. Ovlaštenje posredniku potvrđuje se kroz FiskAplikaciju unutar ePorezne, a to potvrđuje obveznik — ne knjigovođa umjesto njega.",
        why: "Odgovornost za obvezu ostaje na vama i onda kad posao radi netko drugi. Informacijski posrednik odgovara za ispravnost programskog rješenja, ali ne preuzima vašu obvezu.",
        action: "Otvorite FiskAplikaciju u ePoreznoj i provjerite je li posrednik naveden i ovlašten. Zatražite od knjigovođe ime posrednika u pisanom obliku.",
        owner: "Vi",
        deadline: "Ovaj tjedan",
        legal: "NN 89/2025, čl. 58",
        sources: ["pu-eracun", "pu-fiskalizacija"],
      });
    }

    if (a.intermediary === "mikroeracun" && a.vat === "da") {
      f.push({
        id: "posrednik-mikroeracun-nedopusten",
        area: "posrednik",
        severity: "kriticno",
        title: "MikroeRačun nije namijenjen obveznicima PDV-a",
        what: "MikroeRačun mogu koristiti obveznici koji nisu u registru PDV-a i nisu obveznici javne nabave. Vi ste naveli da ste u sustavu PDV-a.",
        action: "Odaberite informacijskog posrednika s liste Porezne uprave i prijavite ga kroz FiskAplikaciju.",
        owner: "Vi",
        deadline: "Odmah",
        legal: "NN 89/2025, čl. 54–56",
        fine: fineFor(a.legalForm, "71"),
        sources: ["pu-fiskalizacija", "nn-89-2025"],
      });
    }

    if (a.intermediary === "mikroeracun" && a.vat !== "da") {
      f.push({
        id: "posrednik-mikroeracun-ok",
        area: "posrednik",
        severity: a.sellsTo.includes("b2g") ? "provjeri" : "ok",
        title: "MikroeRačun je za vas ispravan izbor",
        what: "MikroeRačun je besplatna aplikacija Porezne uprave unutar ePorezne. Zaprimanje radi od 1.1.2026., a izdavanje se otvara 1.1.2027.",
        why: a.sellsTo.includes("b2g")
          ? "Naveli ste da izdajete računa javnom sektoru. MikroeRačun ne mogu koristiti obveznici javne nabave — taj status treba provjeriti."
          : undefined,
        action: a.sellsTo.includes("b2g")
          ? "Provjerite jeste li obveznik javne nabave. Ako jeste, treba vam informacijski posrednik."
          : "Ne trebate plaćati posrednika. Prije 1.1.2027. testirajte izdavanje čim se funkcija otvori.",
        owner: "Vi",
        deadline: "Izdavanje: 1.1.2027.",
        legal: "NN 89/2025, čl. 54–56, čl. 80",
        sources: ["pu-fiskalizacija", "nn-89-2025"],
      });
    }

    if (a.intermediary === "imam") {
      f.push({
        id: "posrednik-odgovornost",
        area: "posrednik",
        severity: "provjeri",
        title: "Posrednik odgovara za softver — obveza ostaje na vama",
        what: "Informacijski posrednik odgovara za ispravnost programskog rješenja. To ne prenosi vašu zakonsku obvezu na njega.",
        why: "U prekršajnom postupku odgovarate vi, a ne posrednik. Zato je bitno znati što je od koraka automatizirano, a što netko mora kliknuti.",
        action: "Zatražite od posrednika pisanu potvrdu što točno rade automatski: fiskalizaciju izdanih, fiskalizaciju primljenih, i eIzvještavanje.",
        owner: "Informacijski posrednik",
        legal: "NN 89/2025, čl. 58",
        sources: ["pu-eracun", "nn-89-2025"],
      });
    }
  }

  // ────────────────────────────────── AMS ───────────────────────────────────

  if (profile.isObliged && a.ams !== "potvrdio") {
    f.push({
      id: "ams-nije-potvrden",
      area: "ams",
      severity: a.ams === "ne-znam" ? "kriticno" : "rizik",
      title: "Adresa za zaprimanje nije potvrđena u adresaru",
      what: "Rok za dostavu i potvrdu adrese u adresaru metapodatkovnih servisa (AMS) bio je 31.12.2025. Bez toga vas izdavatelj ne može pronaći.",
      why: "Ako izdavatelj ne može pronaći vaš identifikator u AMS-u, on ne odgovara za neizdavanje eRačuna — može izdati papirnati račun uz eIzvještavanje. Posljedica pada na vas: račun ne dolazi u vaš sustav, a vaša obveza zaprimanja i dalje postoji.",
      action: "Provjerite status adrese kroz FiskAplikaciju ili kod posrednika i potvrdite je ako nije potvrđena.",
      owner: "Vi + posrednik",
      deadline: "Odmah — rok je prošao 31.12.2025.",
      legal: "NN 89/2025, čl. 40",
      sources: ["pu-fiskalizacija", "nn-89-2025"],
    });
  }

  // ────────────────────────────────── KPD ───────────────────────────────────

  if (profile.isObliged && profile.hasEInvoiceCounterparties && a.invoicingTool !== "ne-izdajem") {
    const mustIssueNow = profile.issuingActive;
    const kpdMissing = a.kpd === "ne" || a.kpd === "ne-znam";
    const sev: Severity = a.kpd === "da-sve" ? "ok" : mustIssueNow ? (kpdMissing ? "kriticno" : "rizik") : kpdMissing ? "rizik" : "provjeri";
    f.push({
      id: "kpd-mapiranje",
      area: "kpd",
      severity: sev,
      title:
        sev === "ok"
          ? "Stavke su mapirane na KPD 2025"
          : mustIssueNow
            ? "Stavke na eRačunu moraju nositi KPD oznaku — sada"
            : "KPD mapiranje treba biti gotovo prije 1.1.2027.",
      what: "Svaka stavka robe ili usluge u eRačunu povezuje se s klasifikacijskom oznakom i iskazuje šesteroznamenkastim brojem. Pretraga je dostupna kroz KLASUS aplikaciju Državnog zavoda za statistiku.",
      why:
        sev === "ok"
          ? undefined
          : "Nedostajući ili pogrešan podatak na eRačunu spada u prekršaje s novčanom kaznom, a u praksi je i najčešći razlog odbijanja računa.",
      action:
        sev === "ok"
          ? "Zadržite popis oznaka uz obrazloženje odabira — koristi kod svake buduće provjere."
          : "Izvezite popis svojih usluga i proizvoda, predložite oznaku za svaku stavku kroz KLASUS, a sporne stavke pošaljite knjigovođi na potvrdu.",
      owner: "Vi + knjigovođa",
      deadline: mustIssueNow ? "Odmah" : "1.1.2027.",
      legal: "NN 89/2025, čl. 73",
      fine: sev === "ok" ? undefined : fineFor(a.legalForm, "73"),
      sources: ["pu-eracun", "klasus"],
    });
  }

  // ────────────────────────────── eIZVJEŠTAVANJE ────────────────────────────

  if (profile.isObliged && (profile.issuingActive || profile.receivingActive)) {
    const handled = a.eIzvjestavanje === "da-sam" || a.eIzvjestavanje === "knjigovoda";
    const escalate = a.rejections === "da" && !handled;
    f.push({
      id: "eizvjestavanje-rokovi",
      area: "eizvjestavanje",
      severity: escalate ? "kriticno" : handled ? (a.eIzvjestavanje === "knjigovoda" ? "provjeri" : "ok") : "rizik",
      title: escalate
        ? "Imali ste odbijanja, a eIzvještavanje se ne radi"
        : "Odbijanja i naplata prijavljuju se do 20. u mjesecu",
      what: "Podaci o odbijenim eRačunima i podaci o naplati dostavljaju se kroz eIzvještavanje do 20. u mjesecu za prethodni mjesec.",
      why: "Dostavom podatka o odbijanju smatra se da je primatelj izjavio da neće koristiti pravo na pretporez. Propuštena prijava zato nije samo administrativni propust nego dira i pretporez.",
      action:
        a.eIzvjestavanje === "knjigovoda"
          ? "Pisano potvrdite s knjigovođom da pokriva obje prijave — i odbijanja i naplatu — i do kojeg datuma."
          : "Uvedite fiksni podsjetnik za 15. u mjesecu i provjerite pokriva li posrednik prijavu automatski.",
      owner: a.eIzvjestavanje === "knjigovoda" ? "Knjigovođa" : "Vi + posrednik",
      deadline: "20. u mjesecu za prethodni mjesec",
      legal: "NN 89/2025, čl. 51, 52, 53",
      fine: handled ? undefined : fineFor(a.legalForm, "73"),
      sources: ["nn-89-2025"],
    });
  }

  if (a.rejections === "ne-znam" && profile.isObliged) {
    f.push({
      id: "odbijanja-vidljivost",
      area: "eizvjestavanje",
      severity: "rizik",
      title: "Ne znate jesu li vam računi odbijani",
      what: "Zakon nije propisao rok u kojem primatelj može odbiti eRačun, ali odbijanje pokreće vašu obvezu prijave i može značiti da račun nikad neće biti plaćen.",
      why: "Odbijeni izlazni račun koji nitko ne prati je istovremeno neprijavljeni prekršaj i nenaplaćeno potraživanje.",
      action: "Tražite od posrednika izvještaj o statusima izdanih eRačuna i prođite zadnja tri mjeseca.",
      owner: "Informacijski posrednik",
      deadline: "Ovaj mjesec",
      legal: "NN 89/2025, čl. 52",
      sources: ["pu-fiskalizacija", "nn-89-2025"],
    });
  }

  // ──────────────────────────────── PROCES ──────────────────────────────────

  if (profile.isObliged && profile.issuingActive && profile.hasEInvoiceCounterparties) {
    if (a.invoicingTool === "excel-word" || a.invoicingTool === "rucno") {
      f.push({
        id: "proces-alat-nije-eracun",
        area: "izdavanje",
        severity: "kriticno",
        title: "Vaš način izdavanja ne proizvodi eRačun",
        what: "eRačun je račun izdan, poslan i zaprimljen u strukturiranom elektroničkom obliku koji omogućuje automatsku obradu bez papira i ručnog unosa. PDF poslan e-mailom, Word ili Excel predložak nisu eRačun.",
        why: "Ovo je propust koji se ponavlja na svakom izdanom računu, a ne jednokratna greška.",
        action: "Prijeđite na program koji izdaje strukturirani eRačun i povezan je s posrednikom. Do tada evidentirajte koje ste račune izdali izvan sustava.",
        owner: "Vi",
        deadline: "Odmah",
        legal: "NN 89/2025, čl. 38",
        fine: fineFor(a.legalForm, "71"),
        sources: ["pu-eracun", "nn-89-2025"],
      });
    }
  }

  if (profile.isObliged && !profile.issuingActive && (a.invoicingTool === "excel-word" || a.invoicingTool === "rucno")) {
    f.push({
      id: "proces-alat-2027",
      area: "izdavanje",
      severity: "rizik",
      title: "Excel, Word i PDF neće biti dovoljni od 1.1.2027.",
      what: "eRačun mora biti u strukturiranom elektroničkom obliku. PDF poslan e-mailom nije eRačun.",
      action: `Do 1.1.2027. (${profile.daysToIssue} dana) odaberite program ili MikroeRačun i izdajte jedan testni eRačun stvarnom kupcu.`,
      owner: "Vi",
      deadline: "1.1.2027.",
      legal: "NN 89/2025, čl. 38",
      sources: ["pu-eracun", "pu-izdavatelji"],
    });
  }

  if (profile.isObliged && a.owner === "nitko") {
    f.push({
      id: "proces-nema-nositelja",
      area: "proces",
      severity: "rizik",
      title: "Nitko nije zadužen za eRačune",
      what: "Rokovi su kratki i ponavljaju se: pet radnih dana za fiskalizaciju primljenog eRačuna, 20. u mjesecu za eIzvještavanje.",
      why: "Rok koji nema vlasnika probije se prvi put kad ste na terenu, bolesni ili na godišnjem.",
      action: "Imenujte jednu osobu i jednu zamjenu. Zapišite to u jednu rečenicu i stavite u kalendar.",
      owner: "Vi",
      deadline: "Ovaj tjedan",
      sources: ["pu-fiskalizacija"],
    });
  }

  if (profile.isObliged && a.owner === "knjigovoda") {
    f.push({
      id: "proces-knjigovoda-granice",
      area: "proces",
      severity: "provjeri",
      title: "Granica prema knjigovođi nije definirana dok nije zapisana",
      what: "Knjigovođa najčešće pokriva knjiženje i prijave, ali ne nužno fiskalizaciju primljenih eRačuna u roku od pet radnih dana ni potvrdu ovlaštenja u FiskAplikaciji.",
      why: "Odgovornost za obvezu ostaje na obvezniku i onda kad posao radi knjigovođa.",
      action: "Pošaljite knjigovođi popis od četiri stavke i tražite potvrdu radi li ih: fiskalizacija primljenih, fiskalizacija izdanih, eIzvještavanje odbijanja, eIzvještavanje naplate.",
      owner: "Knjigovođa",
      deadline: "Ovaj tjedan",
      legal: "NN 89/2025, čl. 58",
      sources: ["pu-fiskalizacija", "nn-89-2025"],
    });
  }

  if (profile.isObliged && (a.volume === "51-200" || a.volume === "200+")) {
    f.push({
      id: "proces-automatizacija",
      area: "proces",
      severity: "provjeri",
      title: "Kod vašeg opsega ručna kontrola prestaje raditi",
      what: `Izdajete ${a.volume === "200+" ? "više od 200" : "51 do 200"} računa mjesečno. Provjera statusa i rokova stavku po stavku nije održiva.`,
      action: "Tražite od posrednika mjesečni izvještaj statusa i uvedite jednu kontrolnu točku umjesto pojedinačne provjere.",
      owner: "Informacijski posrednik",
      sources: ["pu-fiskalizacija"],
    });
  }

  // ─────────────────────────────── REZULTAT ─────────────────────────────────

  const counts: Record<Severity, number> = { kriticno: 0, rizik: 0, provjeri: 0, ok: 0 };
  for (const item of f) counts[item.severity] += 1;

  const weight: Record<Severity, number> = { kriticno: 0, rizik: 45, provjeri: 80, ok: 100 };
  const score = f.length === 0 ? 100 : Math.round(f.reduce((sum, x) => sum + weight[x.severity], 0) / f.length);

  const overall: Severity =
    counts.kriticno > 0 ? "kriticno" : counts.rizik > 0 ? "rizik" : counts.provjeri > 0 ? "provjeri" : "ok";

  const order: Record<Severity, number> = { kriticno: 0, rizik: 1, provjeri: 2, ok: 3 };
  f.sort((x, y) => order[x.severity] - order[y.severity]);

  return { profile, findings: f, score, overall, counts, assessedOn: today };
}

export { fineFor, isPravnaOsoba, daysBetween };
