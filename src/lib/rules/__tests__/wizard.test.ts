import { test } from "node:test";
import assert from "node:assert/strict";

import { QUESTIONS, visibleQuestions, completeAnswers } from "../questions";
import { encodeAnswers, decodeAnswers } from "../../codec";
import { evaluate } from "../engine";
import type { Answers, Severity } from "../types";

/**
 * Čarobnjak je jedini dio proizvoda kroz koji prolazi svaki kupac, a jedini
 * je koji se ne može provjeriti pozivom funkcije — živi u pregledniku.
 *
 * Ovdje se njegova logika grananja izvodi istim redoslijedom kao u
 * `wizard.tsx`: koja su pitanja vidljiva ovisi o dosadašnjim odgovorima, a
 * odluka o završetku pada iz *novog* stanja, ne iz starog. Ako se `wizard.tsx`
 * i ovaj hod raziđu, ovi testovi to neće uhvatiti — zato je hod namjerno
 * kratak i doslovan, da se razlika vidi golim okom.
 */

type Partials = Partial<Answers>;

/** Odabir za jedno pitanje; vraća indeks izbora. */
type Picker = (questionIndex: number, choiceCount: number) => number;

interface Walk {
  answers: Answers;
  /** Koliko je pitanja korisnik stvarno vidio. */
  seen: number;
}

/** Prolazak kroz čarobnjak kao što bi ga prošao čovjek. */
function walk(pick: Picker): Walk {
  let answers: Partials = {};
  let index = 0;
  let seen = 0;

  // Gornja granica je puki osigurač protiv beskonačne petlje ako se grananje
  // pokvari — test tada pada na assertu ispod, a ne visi.
  for (let guard = 0; guard <= QUESTIONS.length + 1; guard++) {
    const questions = visibleQuestions(answers);
    const question = questions[Math.min(index, questions.length - 1)];
    assert.ok(question, "čarobnjak je ostao bez pitanja prije kraja");
    seen++;

    const choice = question.choices[pick(index, question.choices.length)];
    assert.ok(choice, "odabran nepostojeći izbor");

    // Višestruki izbor u čarobnjaku bira jednu stavku pa se ide dalje gumbom;
    // ishod je isti kao jedan odabir u polju.
    answers = {
      ...answers,
      [question.id]: question.multi ? [String(choice.value)] : choice.value,
    };

    const upcoming = visibleQuestions(answers);
    if (index + 1 >= upcoming.length) {
      return { answers: completeAnswers(answers), seen };
    }
    index++;
  }

  assert.fail("čarobnjak se nije zaustavio");
}

const SEVERITIES: Severity[] = ["kriticno", "rizik", "provjeri", "ok"];
const DAN = "2026-09-03";

/** Osamdeset i četiri putanje: svaki pravni oblik × PDV status × četiri stila odgovaranja. */
function allWalks(): Walk[] {
  const out: Walk[] = [];
  const legalForms = QUESTIONS[0].choices.length;
  const vatChoices = QUESTIONS[1].choices.length;

  for (let lf = 0; lf < legalForms; lf++) {
    for (let vat = 0; vat < vatChoices; vat++) {
      for (let style = 0; style < 4; style++) {
        out.push(
          walk((qIndex, count) => {
            if (qIndex === 0) return lf;
            if (qIndex === 1) return vat;
            return (qIndex + style) % count;
          }),
        );
      }
    }
  }
  return out;
}

test("svaka putanja kroz čarobnjak završi i vrati potpune odgovore", () => {
  const walks = allWalks();
  assert.equal(walks.length, 7 * 3 * 4);

  for (const { answers } of walks) {
    for (const q of QUESTIONS) {
      assert.notEqual(
        answers[q.id],
        undefined,
        `odgovor na "${String(q.id)}" nedostaje nakon završenog čarobnjaka`,
      );
    }
  }
});

test("token svake putanje preživi put kroz URL bez promjene značenja", () => {
  for (const { answers } of allWalks()) {
    const decoded = decodeAnswers(encodeAnswers(answers));
    assert.deepEqual(decoded, answers, "token se nije vratio identičan");
  }
});

test("engine ne pukne ni na jednoj putanji i uvijek vrati valjan nalaz", () => {
  for (const { answers } of allWalks()) {
    const r = evaluate(answers, DAN);
    assert.ok(SEVERITIES.includes(r.overall));
    assert.ok(r.findings.length > 0, "izvještaj bez ijednog nalaza je neupotrebljiv");
    assert.ok(r.score >= 0 && r.score <= 100);
  }
});

test("oblik „ostalo” skraćuje čarobnjak na dva pitanja", () => {
  // Prvi izbor je "obrt", zadnji je "ostalo" — provjeravamo oba ruba.
  const ostaloIndex = QUESTIONS[0].choices.findIndex((c) => c.value === "ostalo");
  assert.ok(ostaloIndex >= 0);

  const kratki = walk((qIndex) => (qIndex === 0 ? ostaloIndex : 0));
  assert.equal(kratki.seen, 2, "„ostalo” mora stati na pravnom obliku i PDV-u");

  const puni = walk((qIndex) => (qIndex === 0 ? 0 : 0));
  assert.equal(puni.seen, QUESTIONS.length, "obrt mora proći sva pitanja");
});

/**
 * Najsuptilniji put kroz sučelje: korisnik odgovori na sve, pa se vrati na
 * prvo pitanje i promijeni pravni oblik u „ostalo”. Upitnik se skrati, ali
 * odgovori na sakrivena pitanja ostaju u stanju i završe u tokenu.
 *
 * To ne smije proizvesti nijedan nalaz o obvezi — inače bi izvještaj tvrdio
 * nešto na temelju pitanja koje korisnik u tom prolazu nije ni vidio.
 */
test("povratak i promjena oblika u „ostalo” ne ostavlja nalaze iz prethodnih odgovora", () => {
  const { answers: puni } = walk(() => 0);
  const ostaloIndex = QUESTIONS[0].choices.findIndex((c) => c.value === "ostalo");

  const zastarjeli = completeAnswers({ ...puni, legalForm: "ostalo" });
  assert.equal(QUESTIONS[0].choices[ostaloIndex].value, "ostalo");

  // Stari odgovori su i dalje tu — to je stvarno stanje, ne pretpostavka.
  assert.equal(zastarjeli.invoicingTool, puni.invoicingTool);
  assert.equal(zastarjeli.ams, puni.ams);

  const r = evaluate(zastarjeli, DAN);
  assert.equal(r.profile.isObliged, false, "„ostalo” ne smije proći kao obveznik");

  const tvrdnje = r.findings.filter((f) => f.severity !== "ok" && f.severity !== "provjeri");
  assert.deepEqual(
    tvrdnje.map((f) => f.id),
    [],
    "nijedna tvrdnja o obvezi ne smije preživjeti promjenu oblika u „ostalo”",
  );
});

test("neodabrani višestruki izbor ne izmisli kupce", () => {
  // Korisnik na pitanju o kupcima ne odabere ništa i klikne „Dalje”.
  const bezKupaca = completeAnswers({ legalForm: "obrt", vat: "ne" });
  assert.deepEqual(bezKupaca.sellsTo, [], "prazan odabir mora ostati prazan");

  const r = evaluate(bezKupaca, DAN);
  assert.ok(SEVERITIES.includes(r.overall));
  // Bez ijednog kupca ne smije se tvrditi da postoji obveza izdavanja.
  const izdavanje = r.findings.filter((f) => f.area === "izdavanje" && f.severity === "kriticno");
  assert.deepEqual(izdavanje.map((f) => f.id), []);
});

test("preskočeno pitanje nikad ne prolazi kao potvrda da je nešto riješeno", () => {
  const prazni = completeAnswers({});
  const r = evaluate(prazni, DAN);

  // Neutralne vrijednosti moraju biti „ne znam”, ne „da”.
  assert.equal(prazni.ams, "ne-znam");
  assert.equal(prazni.intermediary, "ne-znam");
  assert.equal(prazni.fiscalizeIncoming, "ne-znam-sto-je");
  assert.ok(SEVERITIES.includes(r.overall));
});
