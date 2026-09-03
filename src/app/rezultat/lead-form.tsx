"use client";

import { useState } from "react";
import type { Assessment } from "@/lib/rules/types";
import { Field, Honeypot, Consent, ErrorNote, submitForm } from "./form-parts";

/**
 * Izlaz za one koji danas neće ništa platiti. Većina neće — i to je uredu.
 * Bolje je zadržati vezu nego ih izgubiti na dnu stranice.
 */
export function LeadForm({ token, assessment }: { token: string; assessment: Assessment }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const urgent = assessment.counts.kriticno > 0;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);

    const result = await submitForm("/api/lead", {
      name: data.get("name"),
      email: data.get("email"),
      phone: data.get("phone"),
      website: data.get("website"),
      consent: data.get("consent") === "on",
      token,
    });

    if (result.ok) setDone(true);
    else {
      setError(result.error);
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="no-print mt-6 rounded-xl border border-[var(--ok-line)] bg-[var(--ok-bg)] p-7">
        <h2 className="display m-0 text-[22px] text-[var(--ok)]">Zaprimljeno.</h2>
        <p className="mt-3 mb-0 max-w-xl text-[16px] leading-relaxed text-[var(--ink-2)]">
          Šaljem vam plan e-mailom. Do tada sačuvajte poveznicu na ovaj izvještaj ili je
          pošaljite knjigovođi — pitanja su već pripremljena gore.
        </p>
      </section>
    );
  }

  return (
    <section className="no-print mt-6 rounded-xl border border-[var(--line)] p-6 md:p-7">
      <h2 className="mt-0 mb-0 text-[20px] font-semibold text-[var(--ink)]">
        {urgent
          ? "Ili samo pošaljite plan na e-mail, besplatno"
          : "Želite li da vas obavijestim kad se propis promijeni?"}
      </h2>
      <p className="mt-3 mb-0 max-w-2xl text-[16px] leading-relaxed text-[var(--ink-2)]">
        {urgent
          ? "Bez obveze i bez naplate. Pošaljem vam ovaj izvještaj poredan po tome što ide prvo, pa ga rješavajte svojim tempom."
          : "Propisi se mijenjaju, a rokovi se ponavljaju svaki mjesec. Javim vam kad se promijeni nešto što se tiče vašeg slučaja."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-3.5">
        <Honeypot />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Ime" name="name" autoComplete="name" />
          <Field label="E-mail" name="email" type="email" required autoComplete="email" />
        </div>
        <Field label="Telefon (nije obavezno)" name="phone" type="tel" autoComplete="tel" />

        <Consent>
          Slažem se da mi Ivan Muktić (FAITECH) pošalje ovaj plan i povremene obavijesti o
          promjenama propisa. Mogu odjaviti u svakom trenutku.
        </Consent>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="mt-1 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg border border-[var(--line-2)] px-5 py-2.5 text-[15px] font-semibold text-[var(--ink-2)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-60"
          >
            {busy ? "Šaljem…" : "Pošalji mi plan"}
          </button>
          <span className="text-[14px] text-[var(--ink-3)]">
            Bez pretplate. Adresa se ne prosljeđuje nikome.
          </span>
        </div>
      </form>
    </section>
  );
}
