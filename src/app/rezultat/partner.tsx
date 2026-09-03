"use client";

import { useState } from "react";
import { Field, TextArea, Honeypot, Consent, ErrorNote, submitForm } from "./form-parts";

/**
 * Ovaj blok govori knjigovođi, ne vlasniku.
 *
 * Izvještaj je napravljen da se proslijedi knjigovođi, pa je knjigovođa
 * predvidiv drugi čitatelj ove stranice. Najveći prigovor u prodaji —
 * „knjigovođa to rješava” — ovdje se pretvara u kanal: jedan ured pokriva
 * 50-200 obveznika, i svakom od njih objašnjava isto.
 *
 * Tekst je podesiv jer isti obrazac služi na dva mjesta s različitim ulazom:
 * na izvještaju, gdje je knjigovođa stigao preko klijenta, i na vlastitoj
 * stranici, gdje je stigao izravno. Obrazac je namjerno jedan — dva bi se
 * razišla, a oba pišu u istu tablicu.
 */
export function PartnerSection({
  eyebrow = "Ako ovo čitate kao knjigovođa",
  heading = "Isto ovo možete dati svim svojim klijentima odjednom",
  body = "Klijent vam je vjerojatno poslao ovaj izvještaj s pitanjima. Umjesto da svakom objašnjavate isto, mogu napraviti provjeru za sve vaše klijente, s vašim imenom na izvještaju i pregledom tko je crven a tko zelen. Najkorisniji dio je popis klijenata kojima obveza zaprimanja teče od 1.1.2026., poredan po riziku.",
  cta = "Javi mi se o partnerstvu",
  /** Na vlastitoj stranici obrazac stoji otvoren; na izvještaju se otvara klikom. */
  defaultOpen = false,
}: {
  eyebrow?: string;
  heading?: string;
  body?: string;
  cta?: string;
  defaultOpen?: boolean;
} = {}) {
  const [open, setOpen] = useState(defaultOpen);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);

    const result = await submitForm("/api/partner", {
      name: data.get("name"),
      email: data.get("email"),
      company: data.get("company"),
      phone: data.get("phone"),
      clientCount: data.get("clientCount"),
      message: data.get("message"),
      website: data.get("website"),
      consent: data.get("consent") === "on",
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
        <h2 className="display m-0 text-[22px] text-[var(--ok)]">Hvala, javljam se.</h2>
        <p className="mt-3 mb-0 max-w-xl text-[16px] leading-relaxed text-[var(--ink-2)]">
          Dogovorit ćemo kratak razgovor o tome kako bi provjera izgledala za vaše klijente.
        </p>
      </section>
    );
  }

  return (
    <section className="no-print mt-6 rounded-xl border border-[var(--line)] p-6 md:p-7">
      <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-3)]">
        {eyebrow}
      </p>
      <h2 className="mt-2 mb-0 text-[20px] font-semibold leading-snug text-[var(--ink)]">
        {heading}
      </h2>
      <p className="mt-3 mb-0 max-w-2xl text-[16px] leading-relaxed text-[var(--ink-2)]">
        {body}
      </p>

      {open ? (
        <form onSubmit={onSubmit} className="mt-6 grid gap-3.5 border-t border-[var(--line)] pt-6">
          <Honeypot />
          <div className="grid gap-3.5 sm:grid-cols-2">
            <Field label="Ime i prezime" name="name" autoComplete="name" />
            <Field label="E-mail" name="email" type="email" required autoComplete="email" />
            <Field label="Naziv ureda" name="company" autoComplete="organization" />
            <Field label="Telefon" name="phone" type="tel" autoComplete="tel" />
          </div>
          <Field
            label="Otprilike koliko klijenata vodite?"
            name="clientCount"
            placeholder="npr. 60"
            maxLength={40}
          />
          <TextArea label="Nešto što bih trebao znati?" name="message" />

          <Consent>
            Slažem se da me Ivan Muktić (FAITECH) kontaktira u vezi partnerskog programa.
          </Consent>

          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="mt-1 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-[var(--brand)] px-6 py-3 text-[16px] font-semibold text-white transition-colors hover:bg-[var(--brand-2)] disabled:opacity-60"
            >
              {busy ? "Šaljem…" : "Pošalji"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-2 py-1 text-[15px] font-medium text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
            >
              Odustani
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-5 rounded-lg border border-[var(--line-2)] px-5 py-2.5 text-[15px] font-semibold text-[var(--ink-2)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          {cta}
        </button>
      )}
    </section>
  );
}
