"use client";

import { useState } from "react";
import type { Offer, Recommendation } from "@/lib/offers";
import { Field, TextArea, Honeypot, Consent, ErrorNote, submitForm } from "./form-parts";

const TONE_TITLE: Record<Recommendation["tone"], string> = {
  hitno: "Što sad",
  popravak: "Što sad",
  odrzavanje: "Da ostane ovako",
};

export function OfferSection({
  recommendation,
  token,
}: {
  recommendation: Recommendation;
  token: string;
}) {
  const [open, setOpen] = useState<Offer | null>(null);
  const [done, setDone] = useState<Offer | null>(null);

  if (done) {
    return (
      <section className="no-print mt-12 rounded-xl border border-[var(--ok-line)] bg-[var(--ok-bg)] p-7">
        <h2 className="display m-0 text-[24px] text-[var(--ok)]">Zahtjev je zaprimljen.</h2>
        <p className="mt-3 mb-0 max-w-xl text-[16px] leading-relaxed text-[var(--ink-2)]">
          Javljam se u roku od jednog radnog dana da dogovorimo termin. Ako nakon uvodnog
          razgovora zaključimo da vam ne mogu pomoći, ne naplaćujem ništa —{" "}
          {done.priceLabel} se plaća tek kad se dogovorimo da idemo dalje.
        </p>
      </section>
    );
  }

  const { primary, secondary, tone, reason } = recommendation;

  return (
    <section className="no-print mt-12">
      <h2 className="display m-0 text-[28px] text-[var(--ink)]">{TONE_TITLE[tone]}</h2>
      <p className="mt-3 mb-0 max-w-2xl text-[16px] leading-relaxed text-[var(--ink-2)]">
        {reason}
      </p>

      <div className="mt-6 grid gap-4">
        <OfferCard
          offer={primary}
          emphasis
          urgent={tone === "hitno"}
          onOpen={() => setOpen(primary)}
          isOpen={open?.id === primary.id}
          token={token}
          onDone={() => setDone(primary)}
          onCancel={() => setOpen(null)}
        />
        {secondary && (
          <OfferCard
            offer={secondary}
            emphasis={false}
            urgent={false}
            onOpen={() => setOpen(secondary)}
            isOpen={open?.id === secondary.id}
            token={token}
            onDone={() => setDone(secondary)}
            onCancel={() => setOpen(null)}
          />
        )}
      </div>
    </section>
  );
}

function OfferCard({
  offer,
  emphasis,
  urgent,
  isOpen,
  onOpen,
  onCancel,
  onDone,
  token,
}: {
  offer: Offer;
  emphasis: boolean;
  urgent: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onCancel: () => void;
  onDone: () => void;
  token: string;
}) {
  return (
    <div
      className={`rounded-xl border p-6 md:p-7 ${
        emphasis
          ? "border-[var(--line-2)] bg-[var(--surface-2)]"
          : "border-[var(--line)] bg-[var(--surface)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {urgent && (
            <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--kriticno)]">
              Preporučeno prema vašim nalazima
            </p>
          )}
          <h3
            className={`m-0 font-semibold leading-snug text-[var(--ink)] ${
              emphasis ? "mt-1.5 text-[22px]" : "text-[19px]"
            }`}
          >
            {offer.headline}
          </h3>
          <p className="mt-2 mb-0 max-w-xl text-[16px] leading-relaxed text-[var(--ink-2)]">
            {offer.promise}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="display m-0 text-[32px] leading-none text-[var(--ink)]">
            {offer.priceLabel}
          </p>
          <p className="m-0 mt-1 text-[13px] text-[var(--ink-3)]">{offer.priceNote}</p>
        </div>
      </div>

      <ul className="m-0 mt-5 grid list-none gap-2 p-0 sm:grid-cols-2">
        {offer.includes.map((x) => (
          <li key={x} className="flex gap-2.5 text-[15px] leading-relaxed text-[var(--ink-2)]">
            <span
              aria-hidden
              className="mt-[9px] h-[5px] w-[5px] shrink-0 rounded-full bg-[var(--brand)]"
            />
            {x}
          </li>
        ))}
      </ul>

      {isOpen ? (
        <OrderForm
          offer={offer}
          token={token}
          onDone={onDone}
          onCancel={onCancel}
        />
      ) : (
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={onOpen}
            className={`rounded-lg px-6 py-3 text-[16px] font-semibold transition-colors ${
              emphasis
                ? "bg-[var(--brand)] text-white hover:bg-[var(--brand-2)]"
                : "border border-[var(--line-2)] text-[var(--ink-2)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
            }`}
          >
            {offer.cta}
          </button>
          <span className="text-[14px] text-[var(--ink-3)]">
            {offer.id === "monitor"
              ? "Otkazivo bilo kad, bez objašnjenja."
              : "Ako vam ne mogu pomoći, ne naplaćujem ništa."}
          </span>
        </div>
      )}
    </div>
  );
}

function OrderForm({
  offer,
  token,
  onDone,
  onCancel,
}: {
  offer: Offer;
  token: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);

    const result = await submitForm("/api/order", {
      product: offer.id,
      token,
      name: data.get("name"),
      email: data.get("email"),
      phone: data.get("phone"),
      company: data.get("company"),
      oib: data.get("oib"),
      message: data.get("message"),
      website: data.get("website"),
      consent: data.get("consent") === "on",
    });

    if (result.ok) onDone();
    else {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-3.5 border-t border-[var(--line-2)] pt-6">
      <Honeypot />
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Ime i prezime" name="name" autoComplete="name" />
        <Field label="E-mail" name="email" type="email" required autoComplete="email" />
        <Field label="Naziv obrta ili firme" name="company" autoComplete="organization" />
        <Field label="Telefon" name="phone" type="tel" autoComplete="tel" />
      </div>
      <Field
        label="OIB (nije obavezno, ubrzava izdavanje računa)"
        name="oib"
        inputMode="numeric"
        maxLength={11}
        placeholder="11 znamenki"
      />
      <TextArea
        label="Nešto što bih trebao znati unaprijed?"
        name="message"
        placeholder="Npr. rok, tko vodi knjigovodstvo, što ste već pokušali."
      />

      <Consent>
        Slažem se da me Ivan Muktić (FAITECH) kontaktira u vezi ovog zahtjeva. Uz zahtjev se
        šalje i poveznica na ovaj izvještaj, da se ne moramo vraćati na početak.
      </Consent>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="mt-1 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[var(--brand)] px-6 py-3 text-[16px] font-semibold text-white transition-colors hover:bg-[var(--brand-2)] disabled:opacity-60"
        >
          {busy ? "Šaljem…" : `Pošalji zahtjev — ${offer.priceLabel}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 text-[15px] font-medium text-[var(--ink-3)] transition-colors hover:text-[var(--ink)]"
        >
          Odustani
        </button>
      </div>
      <p className="m-0 text-[14px] text-[var(--ink-3)]">
        Slanjem zahtjeva ništa ne plaćate. Račun stiže tek nakon uvodnog razgovora i dogovora.
      </p>
    </form>
  );
}
