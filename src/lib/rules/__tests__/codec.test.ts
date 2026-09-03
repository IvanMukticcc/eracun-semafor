import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeAnswers, decodeAnswers } from "../../codec";
import type { Answers } from "../types";

const sample: Answers = {
  legalForm: "obrt",
  vat: "ne",
  sellsTo: ["b2b", "b2g"],
  receivesFromBusinesses: "da",
  invoicingTool: "excel-word",
  intermediary: "nemam",
  ams: "ne-znam",
  fiscalizeIncoming: "ne-znam-sto-je",
  kpd: "ne",
  rejections: "ne",
  eIzvjestavanje: "ne",
  owner: "nitko",
  volume: "11-50",
};

test("kodiranje i dekodiranje vraća isti skup odgovora", () => {
  assert.deepEqual(decodeAnswers(encodeAnswers(sample)), sample);
});

test("token je URL-siguran", () => {
  assert.match(encodeAnswers(sample), /^[A-Za-z0-9_-]+$/);
});

test("prazan višestruki odabir preživi kružni put", () => {
  const empty = { ...sample, sellsTo: [] as Answers["sellsTo"] };
  assert.deepEqual(decodeAnswers(encodeAnswers(empty)), empty);
});

test("duplikati u višestrukom odabiru se uklanjaju", () => {
  const dup = { ...sample, sellsTo: ["b2b", "b2b"] as Answers["sellsTo"] };
  assert.deepEqual(decodeAnswers(encodeAnswers(dup))?.sellsTo, ["b2b"]);
});

test("neispravan ulaz vraća null umjesto pogrešnog izvještaja", () => {
  const bad = [
    "",
    null,
    undefined,
    "nijebase64!!!",
    btoa("{}"),
    btoa(JSON.stringify({ v: 1 })),
    btoa(JSON.stringify({ ...sample, v: 1, vat: "mozda" })),
    btoa(JSON.stringify({ ...sample, v: 1, sellsTo: "b2b" })),
    btoa(JSON.stringify({ ...sample, v: 1, sellsTo: ["nepostojeci"] })),
    btoa(JSON.stringify({ ...sample, v: 99 })),
    btoa(JSON.stringify({ ...sample, v: 1, legalForm: undefined })),
    "a".repeat(5000),
  ];
  for (const t of bad) {
    assert.equal(decodeAnswers(t as string), null, `prihvaćen neispravan token: ${String(t).slice(0, 40)}`);
  }
});

test("nepoznata dodatna polja se odbacuju, ne prenose", () => {
  const token = btoa(JSON.stringify({ ...sample, v: 1, admin: true }));
  const decoded = decodeAnswers(token.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""));
  assert.ok(decoded);
  assert.equal((decoded as unknown as Record<string, unknown>).admin, undefined);
});
