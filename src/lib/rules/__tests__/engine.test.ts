import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluate, buildProfile, fineFor } from "../engine";
import { QUESTIONS, visibleQuestions } from "../questions";
import { SOURCES } from "../sources";
import type { Answers, Finding } from "../types";

const TODAY = "2026-09-03";

const base: Answers = {
  legalForm: "obrt",
  vat: "ne",
  sellsTo: ["b2b"],
  receivesFromBusinesses: "da",
  invoicingTool: "excel-word",
  intermediary: "nemam",
  ams: "ne-znam",
  fiscalizeIncoming: "ne-znam-sto-je",
  kpd: "ne-znam",
  rejections: "ne-znam",
  eIzvjestavanje: "ne",
  owner: "nitko",
  volume: "0-10",
};

const answers = (patch: Partial<Answers> = {}): Answers => ({ ...base, ...patch });
const ids = (f: Finding[]) => f.map((x) => x.id);
const find = (f: Finding[], id: string) => f.find((x) => x.id === id);

// ── Profil obveznika ────────────────────────────────────────────────────────

test("paušalni obrt izvan PDV-a: zaprima od 2026., izdaje od 2027.", () => {
  const p = buildProfile(answers(), TODAY);
  assert.equal(p.receiveFrom, "2026-01-01");
  assert.equal(p.issueFrom, "2027-01-01");
  assert.equal(p.receivingActive, true, "obveza zaprimanja je već na snazi");
  assert.equal(p.issuingActive, false, "obveza izdavanja još nije na snazi");
  assert.equal(p.daysToIssue, 120, "3.9.2026. → 1.1.2027. je 120 dana");
});

test("obveznik PDV-a je u punoj obvezi od 1.1.2026.", () => {
  const p = buildProfile(answers({ vat: "da" }), TODAY);
  assert.equal(p.issueFrom, "2026-01-01");
  assert.equal(p.issuingActive, true);
  assert.equal(p.daysToIssue, 0);
});

test("proračunski korisnik je u punoj obvezi neovisno o PDV statusu", () => {
  const p = buildProfile(answers({ legalForm: "proracunski", vat: "ne" }), TODAY);
  assert.equal(p.issueFrom, "2026-01-01");
  assert.equal(p.issuingActive, true);
});

test("nepoznat PDV status daje neodređen profil, ne pogrešan", () => {
  const p = buildProfile(answers({ vat: "ne-znam" }), TODAY);
  assert.equal(p.isIndeterminate, true);
  assert.equal(p.issueFrom, null, "ne smijemo izmisliti datum obveze izdavanja");
});

test("udruga izvan PDV-a je neodređena dok se ne utvrdi porez na dobit", () => {
  const p = buildProfile(answers({ legalForm: "udruga", vat: "ne" }), TODAY);
  assert.equal(p.isIndeterminate, true);
});

// ── Najvažniji nalaz: propuštena obveza zaprimanja ──────────────────────────

test("paušalist bez kanala dobiva kritičan nalaz o zaprimanju od 1.1.2026.", () => {
  const r = evaluate(answers(), TODAY);
  const z = find(r.findings, "zaprimanje-obveza-aktivna");
  assert.ok(z, "nalaz o zaprimanju mora postojati");
  assert.equal(z.severity, "kriticno");
  assert.match(z.what, /1\.1\.2026/, "mora reći da obveza traje od 2026., ne od 2027.");
  assert.ok(z.fine, "mora navesti raspon kazne");
});

test("tko ne prima račune od firmi ne dobiva nalaz o zaprimanju", () => {
  const r = evaluate(answers({ receivesFromBusinesses: "ne" }), TODAY);
  assert.ok(!ids(r.findings).includes("zaprimanje-obveza-aktivna"));
  assert.ok(!ids(r.findings).includes("fiskalizacija-primljeni"));
});

test("samo B2C i inozemstvo: obveza izdavanja otpada, zaprimanje ostaje", () => {
  const r = evaluate(answers({ sellsTo: ["b2c", "inozemstvo"] }), TODAY);
  assert.ok(ids(r.findings).includes("opseg-nema-b2b"));
  assert.ok(
    ids(r.findings).includes("zaprimanje-obveza-aktivna"),
    "B2C prodaja ne ukida obvezu zaprimanja",
  );
  assert.ok(!ids(r.findings).includes("kpd-mapiranje"), "bez B2B/B2G nema KPD obveze na izlazu");
});

// ── Fiskalizacija ───────────────────────────────────────────────────────────

test("fiskalizacija primljenih: u roku = ok, kasni = rizik, ne radi = kritično", () => {
  const cases: Array<[Answers["fiscalizeIncoming"], string]> = [
    ["da-u-roku", "ok"],
    ["da-ali-kasnim", "rizik"],
    ["ne", "kriticno"],
    ["ne-znam-sto-je", "kriticno"],
  ];
  for (const [input, expected] of cases) {
    const r = evaluate(answers({ fiscalizeIncoming: input }), TODAY);
    assert.equal(find(r.findings, "fiskalizacija-primljeni")?.severity, expected, `${input}`);
  }
});

test("nalaz o fiskalizaciji navodi rok od 5 radnih dana i članak 48", () => {
  const r = evaluate(answers(), TODAY);
  const x = find(r.findings, "fiskalizacija-primljeni");
  assert.match(x!.deadline!, /5 radnih dana/);
  assert.match(x!.legal!, /čl\. 48/);
});

// ── Posrednik ───────────────────────────────────────────────────────────────

test("obveznik PDV-a na MikroeRačunu je kritičan nalaz", () => {
  const r = evaluate(answers({ vat: "da", intermediary: "mikroeracun" }), TODAY);
  const x = find(r.findings, "posrednik-mikroeracun-nedopusten");
  assert.equal(x?.severity, "kriticno");
});

test("neobveznik PDV-a na MikroeRačunu je uredan", () => {
  const r = evaluate(answers({ intermediary: "mikroeracun" }), TODAY);
  assert.equal(find(r.findings, "posrednik-mikroeracun-ok")?.severity, "ok");
  assert.ok(!ids(r.findings).includes("posrednik-mikroeracun-nedopusten"));
});

test("neobveznik PDV-a koji prodaje javnom sektoru na MikroeRačunu treba provjeru", () => {
  const r = evaluate(answers({ intermediary: "mikroeracun", sellsTo: ["b2b", "b2g"] }), TODAY);
  assert.equal(find(r.findings, "posrednik-mikroeracun-ok")?.severity, "provjeri");
});

test("„knjigovođa je riješio” nije dokaz i vodi na kritičan nalaz", () => {
  const r = evaluate(answers({ intermediary: "ne-znam" }), TODAY);
  const x = find(r.findings, "posrednik-ne-znam");
  assert.equal(x?.severity, "kriticno");
  assert.match(x!.action, /FiskAplikacij/i);
});

// ── Kazne ───────────────────────────────────────────────────────────────────

test("raspon kazne se razlikuje za obrt i za pravnu osobu", () => {
  assert.match(fineFor("obrt", "71"), /3\.980 – 39\.810 €/);
  assert.match(fineFor("doo", "71"), /3\.980 – 66\.360 €/);
  assert.match(fineFor("obrt", "72"), /1\.320 – 39\.810 €/);
  assert.match(fineFor("obrt", "73"), /660 – 13\.270 €/);
});

test("nalaz koji je ok nikad ne prijeti kaznom", () => {
  const r = evaluate(CLEAN, TODAY);
  for (const x of r.findings) {
    if (x.severity === "ok") assert.equal(x.fine, undefined, `${x.id} je ok ali prijeti kaznom`);
  }
});

// ── Ocjena i sortiranje ─────────────────────────────────────────────────────

test("uredan obveznik PDV-a nema kritičnih nalaza i ima visok rezultat", () => {
  const r = evaluate(CLEAN, TODAY);
  assert.equal(r.counts.kriticno, 0);
  assert.ok(r.score >= 80, `rezultat ${r.score} je prenizak za urednog obveznika`);
  assert.notEqual(r.overall, "kriticno");
});

test("najgori slučaj je kritičan i nizak", () => {
  const r = evaluate(answers({ vat: "da" }), TODAY);
  assert.equal(r.overall, "kriticno");
  assert.ok(r.counts.kriticno >= 3);
  assert.ok(r.score < 60, `rezultat ${r.score} je previsok za potpuno nespremnog obveznika`);
});

test("nalazi su sortirani po ozbiljnosti", () => {
  const r = evaluate(answers({ vat: "da" }), TODAY);
  const rank = { kriticno: 0, rizik: 1, provjeri: 2, ok: 3 } as const;
  for (let i = 1; i < r.findings.length; i++) {
    assert.ok(
      rank[r.findings[i - 1].severity] <= rank[r.findings[i].severity],
      "kritični nalazi moraju biti prvi",
    );
  }
});

test("isti odgovori uvijek daju isti rezultat", () => {
  const a = evaluate(answers({ vat: "da" }), TODAY);
  const b = evaluate(answers({ vat: "da" }), TODAY);
  assert.deepEqual(a, b);
});

// ── Integritet nalaza ───────────────────────────────────────────────────────

/** Obveznik koji sve radi kako treba — referentna točka za gornju granicu. */
const CLEAN: Answers = answers({
  vat: "da",
  invoicingTool: "program",
  intermediary: "imam",
  ams: "potvrdio",
  fiscalizeIncoming: "da-u-roku",
  kpd: "da-sve",
  rejections: "ne",
  eIzvjestavanje: "da-sam",
  owner: "ja",
});

const SAMPLES: Answers[] = [
  answers(),
  answers({ vat: "da" }),
  answers({ vat: "ne-znam" }),
  answers({ legalForm: "doo", vat: "da", intermediary: "imam", ams: "potvrdio" }),
  answers({ legalForm: "udruga", vat: "ne" }),
  answers({ legalForm: "proracunski", vat: "ne" }),
  answers({ legalForm: "ostalo", vat: "ne" }),
  answers({ sellsTo: ["b2c"] }),
  answers({ sellsTo: [] }),
  answers({ volume: "200+", owner: "knjigovoda", eIzvjestavanje: "knjigovoda" }),
  answers({ invoicingTool: "ne-izdajem", receivesFromBusinesses: "ne" }),
  answers({ vat: "da", rejections: "da", eIzvjestavanje: "ne" }),
  answers({ intermediary: "ne-znam" }),
  answers({ intermediary: "mikroeracun" }),
  answers({ intermediary: "mikroeracun", sellsTo: ["b2b", "b2g"] }),
  answers({ vat: "da", intermediary: "mikroeracun" }),
  answers({ ams: "nisam", fiscalizeIncoming: "da-ali-kasnim", kpd: "djelomicno" }),
  answers({ legalForm: "slobodno-zanimanje", vat: "ne", sellsTo: ["b2g"] }),
  answers({ legalForm: "jdoo", vat: "da", volume: "51-200", owner: "zaposlenik" }),
  answers({ invoicingTool: "knjigovoda", owner: "knjigovoda", eIzvjestavanje: "knjigovoda" }),
  CLEAN,
];

test("svaki nalaz ima izvor, i svaki izvor postoji u katalogu", () => {
  for (const s of SAMPLES) {
    for (const x of evaluate(s, TODAY).findings) {
      assert.ok(x.sources.length > 0, `${x.id} nema izvor`);
      for (const id of x.sources) {
        assert.ok(SOURCES[id], `${x.id} citira nepostojeći izvor "${id}"`);
      }
    }
  }
});

test("svaki nalaz ima konkretnu radnju i nositelja", () => {
  for (const s of SAMPLES) {
    for (const x of evaluate(s, TODAY).findings) {
      assert.ok(x.action.trim().length > 15, `${x.id} nema konkretnu radnju`);
      assert.ok(x.owner, `${x.id} nema nositelja`);
      assert.ok(x.title.trim().length > 0, `${x.id} nema naslov`);
    }
  }
});

test("nema dupliciranih nalaza unutar jednog izvještaja", () => {
  for (const s of SAMPLES) {
    const list = ids(evaluate(s, TODAY).findings);
    assert.equal(new Set(list).size, list.length, `duplicirani nalaz u ${JSON.stringify(s.legalForm)}`);
  }
});

test("kritičan nalaz uvijek nosi rok", () => {
  for (const s of SAMPLES) {
    for (const x of evaluate(s, TODAY).findings) {
      if (x.severity === "kriticno") assert.ok(x.deadline, `${x.id} je kritičan bez roka`);
    }
  }
});

test("engine nikad ne pukne i uvijek nešto vrati", () => {
  for (const s of SAMPLES) {
    const r = evaluate(s, TODAY);
    assert.ok(r.findings.length > 0, `prazan izvještaj za ${s.legalForm}/${s.vat}`);
    assert.ok(r.score >= 0 && r.score <= 100);
  }
});

// ── Upitnik ─────────────────────────────────────────────────────────────────

test("svako pitanje ima jedinstven id i barem dva izbora", () => {
  const seen = new Set<string>();
  for (const q of QUESTIONS) {
    assert.ok(!seen.has(q.id), `duplicirano pitanje ${q.id}`);
    seen.add(q.id);
    assert.ok(q.choices.length >= 2, `${q.id} ima premalo izbora`);
  }
});

test("upitnik pokriva svako polje odgovora", () => {
  const asked = new Set(QUESTIONS.map((q) => q.id));
  for (const key of Object.keys(base) as Array<keyof Answers>) {
    assert.ok(asked.has(key), `polje "${key}" se nigdje ne pita`);
  }
});

test("oblik „ostalo” skraćuje upitnik na osnovna pitanja", () => {
  const shown = visibleQuestions({ legalForm: "ostalo" }).map((q) => q.id);
  assert.ok(shown.includes("vat"));
  assert.ok(!shown.includes("kpd"), "nema smisla pitati za KPD ako oblik nije pokriven");
});

// ── Paket za knjigovođu i posrednika ────────────────────────────────────────

import { buildHandoff, HANDOFF_FINDING_IDS } from "../handoff";

const ALL_PRODUCED_IDS = new Set(SAMPLES.flatMap((s) => ids(evaluate(s, TODAY).findings)));

test("nepokriven pravni oblik nadjačava nepoznat PDV status", () => {
  const p = buildProfile(answers({ legalForm: "ostalo", vat: "ne-znam" }), TODAY);
  assert.equal(p.isObliged, false, "ne smijemo tvrditi obvezu za oblik koji ne poznajemo");
  assert.equal(p.receiveFrom, null);
});

test("svako pitanje u paketu je vezano uz nalaz koji engine stvarno proizvodi", () => {
  for (const id of HANDOFF_FINDING_IDS) {
    assert.ok(ALL_PRODUCED_IDS.has(id), `paket citira nepostojeći nalaz "${id}"`);
  }
});

test("uredan obveznik nema pitanja za knjigovođu, samo potvrdna za posrednika", () => {
  const h = buildHandoff(
    evaluate({ ...CLEAN, receivesFromBusinesses: "ne" }, TODAY).findings,
  );
  assert.equal(h.knjigovoda.length, 0, "nema što pitati knjigovođu kad je sve uredno");
  assert.ok(
    h.posrednik.length > 0,
    "nalazi „za provjeru” moraju roditi potvrdno pitanje posredniku",
  );
});

test("nespreman paušalist dobiva pitanja za obje strane, bez duplikata", () => {
  const h = buildHandoff(evaluate(answers(), TODAY).findings);
  assert.ok(h.knjigovoda.length > 0, "mora imati pitanja za knjigovođu");
  assert.ok(h.posrednik.length > 0, "mora imati pitanja za posrednika");
  assert.equal(new Set(h.knjigovoda).size, h.knjigovoda.length);
  assert.equal(new Set(h.posrednik).size, h.posrednik.length);
});
