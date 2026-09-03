import { test } from "node:test";
import assert from "node:assert/strict";

import {
  todayISO,
  daysUntil,
  daysUntil2027,
  daysSince2026,
  formatHr,
  danaLabel,
} from "../../date";

/**
 * Datumi su na naslovnici i u izvještaju izgovoreni kao tvrdnja („još toliko
 * dana”), pa moraju biti točni. Zakonski rokovi su kalendarski datumi u
 * hrvatskom vremenu, neovisno o tome gdje server stoji.
 */

test("dana do 1.1.2027. se broji od zadanog dana, ne od stvarnog danas", () => {
  assert.equal(daysUntil2027("2026-12-31"), 1);
  assert.equal(daysUntil2027("2027-01-01"), 0);
  assert.equal(daysUntil2027("2026-09-03"), 120, "brief računa sa 120 dana na 3.9.2026.");
});

test("nakon roka odbrojavanje stoji na nuli umjesto da ide u minus", () => {
  assert.equal(daysUntil2027("2027-06-01"), 0);
  assert.equal(daysSince2026("2025-12-01"), 0);
});

test("dana otkad obveza zaprimanja traje", () => {
  assert.equal(daysSince2026("2026-01-01"), 0);
  assert.equal(daysSince2026("2026-01-02"), 1);
  // 2026 nije prijestupna: 31+28+31+30+31+30+31+31 = 243 dana do 1.9.
  assert.equal(daysSince2026("2026-09-03"), 245);
});

test("prijestupna godina se ne preskače", () => {
  // 2028. je prijestupna; 29.2. mora postojati kao dan.
  assert.equal(daysUntil("2028-03-01", "2028-02-28"), 2);
});

test("hrvatski oblik datuma i deklinacija uz broj", () => {
  assert.equal(formatHr("2026-09-03"), "3.9.2026.");
  assert.equal(formatHr("2027-01-01"), "1.1.2027.");
  assert.equal(danaLabel(1), "dan");
  assert.equal(danaLabel(2), "dana");
  assert.equal(danaLabel(120), "dana");
});

test("današnji dan se računa po hrvatskom vremenu, ne po UTC-u", () => {
  // 31.12. u 23:30 po zagrebačkom vremenu je još uvijek 31.12., iako je u UTC-u
  // već 22:30 istog dana — a pola sata kasnije mijenja se i godina.
  assert.equal(todayISO(new Date("2026-12-31T22:30:00Z")), "2026-12-31");
  assert.equal(todayISO(new Date("2026-12-31T23:30:00Z")), "2027-01-01");
});
