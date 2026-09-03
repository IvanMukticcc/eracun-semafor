import { test } from "node:test";
import assert from "node:assert/strict";

import {
  METRIKE,
  izmjeri,
  lijevak,
  kriticniTest,
  KRITICNI_TEST_PRAG,
  type Brojevi,
} from "../../funnel";

/**
 * Lijevak je jedini razlog zašto `/ops` postoji. Ako krivo računa, hipoteze iz
 * monetizacije se ne mogu opovrgnuti, a onda se gradi po dojmu.
 */

const PRAZNO: Brojevi = {
  provjere: 0,
  provjereKriticne: 0,
  provjereUredne: 0,
  prijave: 0,
  zahtjevi: 0,
  zahtjeviAudit: 0,
  placeniSvi: 0,
  placeniAuditi: 0,
  placeniSetupi: 0,
};

test("prazna baza ne donosi nijedan sud", () => {
  for (const m of lijevak(PRAZNO)) {
    assert.equal(m.stanje, "premalo", `${m.id} je ocijenjen bez ijednog podatka`);
    assert.equal(m.udio, null);
  }
  assert.deepEqual(kriticniTest(0, 0), { udio: null, prolazi: null });
});

test("ispod praga uzorka nema ocjene, koliko god omjer izgledao uvjerljivo", () => {
  const m = METRIKE[0]; // prag 20
  // Tri od tri je 100 %, ali iz tri mjerenja to ne znači ništa.
  const r = izmjeri(m, 3, 3);
  assert.equal(r.stanje, "premalo");
  assert.equal(r.udio, null);

  // Točno na pragu uzorka sud se donosi — 4 od 20 je 20 %, unutar 15–25 %.
  const naPragu = izmjeri(m, 4, 20);
  assert.notEqual(naPragu.stanje, "premalo", "na pragu uzorka ocjena mora postojati");
  assert.equal(naPragu.udio, 20);
  assert.equal(naPragu.stanje, "unutar");

  // Jedan uzorak manje i suda više nema, ma koliki bio omjer.
  assert.equal(izmjeri(m, 4, 19).stanje, "premalo");
});

test("granice raspona su uključive s obje strane", () => {
  const m = METRIKE[0]; // hipoteza 15–25 %
  assert.equal(izmjeri(m, 3, 20).udio, 15);
  assert.equal(izmjeri(m, 3, 20).stanje, "unutar", "donja granica mora biti unutar");
  assert.equal(izmjeri(m, 5, 20).udio, 25);
  assert.equal(izmjeri(m, 5, 20).stanje, "unutar", "gornja granica mora biti unutar");

  assert.equal(izmjeri(m, 2, 20).stanje, "ispod"); // 10 %
  assert.equal(izmjeri(m, 6, 20).stanje, "iznad"); // 30 %
});

test("nazivnik nula nikad ne dijeli s nulom", () => {
  for (const m of METRIKE) {
    const r = izmjeri(m, 0, 0);
    assert.equal(r.udio, null);
    assert.equal(r.stanje, "premalo");
    assert.ok(Number.isFinite(r.brojnik));
  }
});

test("poznat skup podataka daje očekivanu ocjenu svake metrike", () => {
  // 25 provjera: 15 kritičnih, 4 uredne. 5 prijava. 12 zahtjeva, od toga 8
  // audit; plaćeno 3, od toga 2 audita i 1 setup.
  const b: Brojevi = {
    provjere: 25,
    provjereKriticne: 15,
    provjereUredne: 4,
    prijave: 5,
    zahtjevi: 12,
    zahtjeviAudit: 8,
    placeniSvi: 3,
    placeniAuditi: 2,
    placeniSetupi: 1,
  };

  const po = Object.fromEntries(lijevak(b).map((m) => [m.id, m]));

  assert.equal(po["provjera-prijava"].udio, 20);
  assert.equal(po["provjera-prijava"].stanje, "unutar"); // 15–25

  assert.equal(po["provjera-kriticno"].udio, 60);
  assert.equal(po["provjera-kriticno"].stanje, "unutar"); // 50–70

  assert.equal(po["provjera-audit"].udio, 32);
  assert.equal(po["provjera-audit"].stanje, "iznad"); // 3–6

  assert.equal(po["zahtjev-placeno"].udio, 25);
  assert.equal(po["zahtjev-placeno"].stanje, "ispod"); // 40–60

  // Dva plaćena audita su premalo za sud o nadogradnji, ma koliki bio omjer.
  assert.equal(po["audit-setup"].stanje, "premalo");
  assert.equal(po["audit-setup"].udio, null);
});

test("kritični test prolazi samo dok je uredan obveznik manjina", () => {
  // 4 uredne od 25 = 16 %, ispod praga od 20 % — klin stoji.
  const dobar = kriticniTest(4, 25);
  assert.equal(dobar.udio, 16);
  assert.equal(dobar.prolazi, true);

  // 10 od 25 = 40 % — većina nema što popraviti, klin je upitan.
  const los = kriticniTest(10, 25);
  assert.equal(los.udio, 40);
  assert.equal(los.prolazi, false);

  // Točno na pragu ne prolazi: prag je „ispod 20 %”, ne „najviše 20 %”.
  const naPragu = kriticniTest(5, 25);
  assert.equal(naPragu.udio, KRITICNI_TEST_PRAG);
  assert.equal(naPragu.prolazi, false);

  // Ispod dvadeset provjera nema suda.
  assert.equal(kriticniTest(1, 19).prolazi, null);
});

test("svaka metrika ima raspon koji ima smisla i objašnjenje pada", () => {
  const ids = new Set<string>();
  for (const m of METRIKE) {
    assert.ok(!ids.has(m.id), `duplicirani id metrike: ${m.id}`);
    ids.add(m.id);

    assert.ok(m.min < m.max, `${m.id}: donja granica nije manja od gornje`);
    assert.ok(m.min >= 0 && m.max <= 100, `${m.id}: raspon izvan 0–100 %`);
    assert.ok(m.minUzorak > 0, `${m.id}: prag uzorka mora biti pozitivan`);
    assert.ok(m.akoPadne.length > 20, `${m.id}: nema objašnjenja što znači pad`);
    assert.ok(m.naziv.length > 0);
  }
  assert.equal(METRIKE.length, 5, "monetizacija propisuje pet metrika");
});

test("lijevak vraća metrike istim redoslijedom kojim su propisane", () => {
  assert.deepEqual(
    lijevak(PRAZNO).map((m) => m.id),
    METRIKE.map((m) => m.id),
  );
});
