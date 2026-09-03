import { test } from "node:test";
import assert from "node:assert/strict";
import { recommend, OFFERS } from "../../offers";
import { evaluate } from "../engine";
import type { Answers } from "../types";

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
const a = (p: Partial<Answers> = {}): Answers => ({ ...base, ...p });
const rec = (p: Partial<Answers> = {}) => {
  const answers = a(p);
  return recommend(evaluate(answers, TODAY), answers);
};

const CLEAN: Partial<Answers> = {
  vat: "da",
  invoicingTool: "program",
  intermediary: "imam",
  ams: "potvrdio",
  fiscalizeIncoming: "da-u-roku",
  kpd: "da-sve",
  rejections: "ne",
  eIzvjestavanje: "da-sam",
  owner: "ja",
  receivesFromBusinesses: "ne",
};

test("kritični nalazi vode na audit s hitnim tonom", () => {
  const r = rec();
  assert.equal(r.primary.id, "audit");
  assert.equal(r.tone, "hitno");
  assert.match(r.reason, /kritičn/);
});

test("velikom obvezniku se uz audit nudi setup, malom monitor", () => {
  assert.equal(rec({ volume: "200+" }).secondary?.id, "setup");
  assert.equal(rec({ legalForm: "doo", vat: "da" }).secondary?.id, "setup");
  assert.equal(rec({ volume: "0-10" }).secondary?.id, "monitor");
});

test("uredan obveznik ne dobiva audit nego samo monitor", () => {
  const r = rec(CLEAN);
  assert.equal(r.primary.id, "monitor");
  assert.equal(r.secondary, null, "kod urednog nalaza druga ponuda samo odvlači pažnju");
  assert.equal(r.tone, "odrzavanje");
});

test("obrazloženje urednog nalaza izričito odbija naplatu", () => {
  assert.match(rec(CLEAN).reason, /ne bih ga naplatio/);
});

test("cijene su cijeli centi i poklapaju se s oznakom", () => {
  for (const o of Object.values(OFFERS)) {
    assert.ok(Number.isInteger(o.priceCents) && o.priceCents >= 0, `${o.id}`);
    if (o.priceCents > 0) {
      assert.equal(o.priceLabel, `${o.priceCents / 100} €`, `${o.id} oznaka cijene`);
    }
    assert.ok(o.includes.length >= 4, `${o.id} ponuda je premršava`);
    assert.ok(o.cta.length > 0);
  }
});

test("preporuka nikad ne vraća istu ponudu dvaput", () => {
  for (const p of [{}, { volume: "200+" as const }, { legalForm: "doo" as const, vat: "da" as const }, CLEAN]) {
    const r = rec(p);
    assert.notEqual(r.primary.id, r.secondary?.id);
  }
});
