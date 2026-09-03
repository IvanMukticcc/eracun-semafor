"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { visibleQuestions, completeAnswers } from "@/lib/rules/questions";
import type { Answers } from "@/lib/rules/types";
import { encodeAnswers } from "@/lib/codec";

type Partials = Partial<Answers>;

export default function Wizard() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Partials>({});
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const questions = useMemo(() => visibleQuestions(answers), [answers]);
  const question = questions[Math.min(index, questions.length - 1)];
  const total = questions.length;
  const isMulti = Boolean(question?.multi);

  const finish = useCallback(
    (final: Partials) => {
      setSubmitting(true);
      router.push(`/rezultat?a=${encodeAnswers(completeAnswers(final))}`);
    },
    [router],
  );

  const advance = useCallback(
    (next: Partials) => {
      // Odgovor može promijeniti koji su daljnji koraci vidljivi, pa se
      // duljina računa iz novog stanja, ne iz starog.
      const upcoming = visibleQuestions(next);
      if (index + 1 >= upcoming.length) finish(next);
      else setIndex(index + 1);
    },
    [index, finish],
  );

  const choose = useCallback(
    (value: string) => {
      if (!question || submitting) return;

      if (question.multi) {
        const current = (answers[question.id] as string[] | undefined) ?? [];
        const next = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        setAnswers({ ...answers, [question.id]: next });
        return;
      }

      const next = { ...answers, [question.id]: value };
      setAnswers(next);
      advance(next);
    },
    [question, answers, submitting, advance],
  );

  const back = useCallback(() => {
    if (index > 0) setIndex(index - 1);
  }, [index]);

  // Brojčane tipke biraju odgovor — brže je za nekoga tko prolazi 13 pitanja.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!question || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (n >= 1 && n <= question.choices.length) {
        e.preventDefault();
        choose(String(question.choices[n - 1].value));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [question, choose]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [index]);

  if (!question) return null;

  const selected = answers[question.id];
  const multiSelected = (selected as string[] | undefined) ?? [];
  const progress = Math.round((index / total) * 100);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-140px)] max-w-2xl flex-col px-5 py-10 md:py-14">
      {/* Napredak */}
      <div>
        <div className="flex items-baseline justify-between text-[14px] text-[var(--ink-3)]">
          <span className="font-medium text-[var(--ink-2)]">{question.step}</span>
          <span className="tnum">
            Pitanje {index + 1} od {total}
          </span>
        </div>
        <div
          className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-[var(--surface-3)]"
          role="progressbar"
          aria-valuenow={index + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label="Napredak provjere"
        >
          <div
            className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-300 ease-out"
            style={{ width: `${Math.max(progress, 4)}%` }}
          />
        </div>
      </div>

      {/* Pitanje */}
      <fieldset className="m-0 mt-10 min-w-0 border-0 p-0">
        <legend className="contents">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="display m-0 text-[30px] text-[var(--ink)] outline-none sm:text-[36px]"
          >
            {question.title}
          </h1>
        </legend>
        {question.help && (
          <p className="mt-4 mb-0 text-[16px] leading-relaxed text-[var(--ink-2)]">
            {question.help}
          </p>
        )}
        {isMulti && (
          <p className="mt-3 mb-0 text-[14px] font-medium text-[var(--ink-3)]">
            Odaberite sve što vrijedi.
          </p>
        )}

        <div className="mt-7 grid gap-2.5">
          {question.choices.map((choice, i) => {
            const value = String(choice.value);
            const isSelected = isMulti ? multiSelected.includes(value) : selected === value;
            return (
              <label
                key={value}
                className={`group flex cursor-pointer items-start gap-3.5 rounded-lg border px-4 py-3.5 transition-colors ${
                  isSelected
                    ? "border-[var(--brand)] bg-[var(--brand-soft)]"
                    : "border-[var(--line-2)] bg-[var(--surface)] hover:border-[var(--brand)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <input
                  type={isMulti ? "checkbox" : "radio"}
                  name={String(question.id)}
                  value={value}
                  checked={isSelected}
                  onChange={() => choose(value)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`tnum mt-[1px] flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[13px] font-semibold ${
                    isSelected
                      ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                      : "border-[var(--line-2)] text-[var(--ink-3)] group-hover:border-[var(--brand)]"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-[17px] font-medium leading-snug text-[var(--ink)]">
                    {choice.label}
                  </span>
                  {choice.hint && (
                    <span className="mt-0.5 block text-[14px] text-[var(--ink-3)]">
                      {choice.hint}
                    </span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Navigacija */}
      <div className="mt-8 flex items-center justify-between gap-4">
        {index > 0 ? (
          <button
            type="button"
            onClick={back}
            className="rounded-md px-2 py-1 text-[15px] font-medium text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
          >
            ← Natrag
          </button>
        ) : (
          <Link
            href="/"
            className="rounded-md px-2 py-1 text-[15px] font-medium text-[var(--ink-3)] no-underline transition-colors hover:text-[var(--ink)]"
          >
            ← Odustani
          </Link>
        )}

        {isMulti && (
          <button
            type="button"
            onClick={() => advance(answers)}
            disabled={submitting}
            className="rounded-lg bg-[var(--brand)] px-6 py-3 text-[16px] font-semibold text-white transition-colors hover:bg-[var(--brand-2)] disabled:opacity-60"
          >
            {index + 1 >= total ? "Prikaži rezultat" : "Dalje"}
          </button>
        )}
      </div>

      <p className="mt-auto pt-10 text-[14px] leading-relaxed text-[var(--ink-3)]">
        Odgovori ostaju u vašem pregledniku i u poveznici na izvještaj. Ne spremaju se na server
        osim ako sami ne zatražite da vam pošaljem plan.
      </p>
    </div>
  );
}
