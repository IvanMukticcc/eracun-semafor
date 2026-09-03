import type { Metadata } from "next";
import Link from "next/link";
import { decodeAnswers } from "@/lib/codec";
import { evaluate } from "@/lib/rules/engine";
import { buildHandoff } from "@/lib/rules/handoff";
import { SOURCES } from "@/lib/rules/sources";
import { SEVERITY_LABEL, SEVERITY_SUMMARY, AREA_LABEL } from "@/lib/labels";
import { todayISO, formatHr, danaLabel } from "@/lib/date";
import { reportAsText } from "@/lib/report-text";
import type { Assessment, Finding, Severity } from "@/lib/rules/types";
import { recommend } from "@/lib/offers";
import { ReportActions, CopyList } from "./actions";
import { LeadForm } from "./lead-form";
import { OfferSection } from "./offer";
import { PartnerSection } from "./partner";
import { RecordAssessment } from "./record";

export const metadata: Metadata = {
  title: "Vaš izvještaj",
  // Izvještaj sadrži podatke o konkretnom poslovanju — ne smije u tražilice.
  robots: { index: false, follow: false, nocache: true },
};

const HEADLINE: Record<Severity, string> = {
  kriticno: "Imate obveze koje su već na snazi, a nisu ispunjene.",
  rizik: "Osnovno stoji, ali nekoliko koraka nije pouzdano.",
  provjeri: "Nema otvorenih propusta, ali nekoliko stvari treba potvrditi.",
  ok: "Prema vašim odgovorima nema otvorenih koraka.",
};

export default async function RezultatPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string }>;
}) {
  const token = (await searchParams).a;
  const answers = decodeAnswers(token);
  if (!answers) return <Invalid />;

  const assessment = evaluate(answers, todayISO());
  const handoff = buildHandoff(assessment.findings);
  const recommendation = recommend(assessment, answers);
  const text = reportAsText(assessment);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:py-14">
      <RecordAssessment token={token ?? ""} />
      <Header assessment={assessment} />
      <div className="mt-8">
        <ReportActions reportText={text} />
      </div>
      <Findings findings={assessment.findings} />
      <Handoff handoff={handoff} />
      <OfferSection recommendation={recommendation} token={token ?? ""} />
      <LeadForm token={token ?? ""} assessment={assessment} />
      <PartnerSection />
      <Sources assessedOn={assessment.assessedOn} />
    </main>
  );
}

/* ── Zaglavlje ───────────────────────────────────────────────────────────── */

function Header({ assessment }: { assessment: Assessment }) {
  const { profile, counts, overall, assessedOn } = assessment;

  return (
    <header className="print-break">
      <p className="m-0 text-[13px] font-semibold uppercase tracking-[0.09em] text-[var(--ink-3)]">
        Izvještaj o spremnosti · {formatHr(assessedOn)}
      </p>
      <h1 className="display mt-3 mb-0 text-[34px] leading-[1.12] text-[var(--ink)] sm:text-[42px]">
        {HEADLINE[overall]}
      </h1>
      <p className="mt-4 mb-0 text-[17px] leading-relaxed text-[var(--ink-2)]">
        {profile.categoryLabel}.{" "}
        {profile.isIndeterminate
          ? "Jedan podatak nedostaje da bi se obveza mogla utvrditi sa sigurnošću — vidi prvi nalaz."
          : profile.issueFrom && !profile.issuingActive
            ? `Obveza izdavanja počinje ${formatHr(profile.issueFrom)}, za ${profile.daysToIssue} ${danaLabel(profile.daysToIssue)}.`
            : "Sve navedene obveze su već na snazi."}
      </p>

      {/* Semafor */}
      <div className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {(["kriticno", "rizik", "provjeri", "ok"] as Severity[]).map((sev) => {
          const n = counts[sev];
          return (
            <div
              key={sev}
              className={`sev-${sev} rounded-lg border px-4 py-3.5 ${
                n > 0
                  ? "border-[var(--sev-line)] bg-[var(--sev-bg)]"
                  : "border-[var(--line)] bg-[var(--surface)]"
              }`}
            >
              <p
                className={`tnum m-0 text-[26px] font-semibold leading-none ${
                  n > 0 ? "text-[var(--sev)]" : "text-[var(--ink-3)]"
                }`}
              >
                {n}
              </p>
              <p
                className={`m-0 mt-1.5 text-[14px] font-medium ${
                  n > 0 ? "text-[var(--sev)]" : "text-[var(--ink-3)]"
                }`}
              >
                {SEVERITY_LABEL[sev]}
              </p>
            </div>
          );
        })}
      </div>

      {/* Činjenice o obvezi */}
      <dl className="mt-7 grid grid-cols-1 gap-x-8 gap-y-0 border-t border-[var(--line)] sm:grid-cols-2">
        <Fact term="Obveza zaprimanja i fiskalizacije primljenih">
          {profile.receiveFrom ? (
            <>
              od {formatHr(profile.receiveFrom)}
              {profile.receivingActive && (
                <span className="ml-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--kriticno)]">
                  na snazi
                </span>
              )}
            </>
          ) : (
            "nije utvrđeno"
          )}
        </Fact>
        <Fact term="Obveza izdavanja i fiskalizacije izdanih">
          {profile.issueFrom ? (
            <>
              od {formatHr(profile.issueFrom)}
              {profile.issuingActive ? (
                <span className="ml-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--kriticno)]">
                  na snazi
                </span>
              ) : (
                <span className="ml-2 text-[13px] font-semibold uppercase tracking-wide text-[var(--rizik)]">
                  za {profile.daysToIssue} {danaLabel(profile.daysToIssue)}
                </span>
              )}
            </>
          ) : (
            "nije utvrđeno"
          )}
        </Fact>
      </dl>
    </header>
  );
}

function Fact({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--line)] py-3.5">
      <dt className="m-0 text-[13px] font-medium uppercase tracking-[0.05em] text-[var(--ink-3)]">
        {term}
      </dt>
      <dd className="m-0 mt-1 text-[16px] font-medium text-[var(--ink)]">{children}</dd>
    </div>
  );
}

/* ── Nalazi ──────────────────────────────────────────────────────────────── */

function Findings({ findings }: { findings: Finding[] }) {
  const groups = (["kriticno", "rizik", "provjeri", "ok"] as Severity[])
    .map((sev) => ({ sev, items: findings.filter((f) => f.severity === sev) }))
    .filter((g) => g.items.length > 0);

  return (
    <section className="mt-12">
      <h2 className="display m-0 text-[28px] text-[var(--ink)]">Nalazi</h2>
      {groups.map(({ sev, items }) => (
        <div key={sev} className="mt-8">
          <div className={`sev-${sev} flex items-baseline gap-3`}>
            <span className="text-[15px] font-semibold uppercase tracking-[0.06em] text-[var(--sev)]">
              {SEVERITY_LABEL[sev]}
            </span>
            <span className="text-[14px] text-[var(--ink-3)]">{SEVERITY_SUMMARY[sev]}</span>
          </div>
          <div className="mt-4 grid gap-3">
            {items.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function FindingCard({ finding: f }: { finding: Finding }) {
  return (
    <article
      className={`sev-${f.severity} print-break rounded-lg border border-[var(--line)] border-l-[3px] border-l-[var(--sev)] bg-[var(--surface)] p-5`}
    >
      <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-3)]">
        {AREA_LABEL[f.area]}
      </p>
      <h3 className="mt-1.5 mb-0 text-[19px] font-semibold leading-snug text-[var(--ink)]">
        {f.title}
      </h3>
      <p className="mt-3 mb-0 text-[16px] leading-relaxed text-[var(--ink-2)]">{f.what}</p>
      {f.why && (
        <p className="mt-3 mb-0 text-[16px] leading-relaxed text-[var(--ink-2)]">{f.why}</p>
      )}

      <div className="mt-4 rounded-md bg-[var(--surface-2)] px-4 py-3">
        <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.07em] text-[var(--ink-3)]">
          Sljedeći korak
        </p>
        <p className="m-0 mt-1 text-[16px] leading-relaxed text-[var(--ink)]">{f.action}</p>
      </div>

      <dl className="m-0 mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
        <Meta term="Nositelj">{f.owner}</Meta>
        {f.deadline && <Meta term="Rok">{f.deadline}</Meta>}
        {f.legal && <Meta term="Uporište">{f.legal}</Meta>}
      </dl>

      {f.fine && (
        <p className="m-0 mt-3 border-t border-[var(--line)] pt-3 text-[13px] text-[var(--ink-3)]">
          <span className="font-semibold text-[var(--ink-2)]">Raspon novčane kazne:</span> {f.fine}
        </p>
      )}
    </article>
  );
}

function Meta({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="m-0 inline font-semibold uppercase tracking-[0.05em] text-[var(--ink-3)]">
        {term}:{" "}
      </dt>
      <dd className="m-0 inline text-[var(--ink-2)]">{children}</dd>
    </div>
  );
}

/* ── Paket za treće strane ───────────────────────────────────────────────── */

function Handoff({ handoff }: { handoff: { knjigovoda: string[]; posrednik: string[] } }) {
  if (!handoff.knjigovoda.length && !handoff.posrednik.length) return null;

  return (
    <section className="mt-12 print-break">
      <h2 className="display m-0 text-[28px] text-[var(--ink)]">Što poslati dalje</h2>
      <p className="mt-3 mb-0 text-[16px] leading-relaxed text-[var(--ink-2)]">
        Pitanja su formulirana tako da se mogu doslovno prepisati u poruku. Odgovor u pisanom
        obliku vrijedi više od usmene potvrde — ako zapne, imate trag tko je što potvrdio.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {handoff.knjigovoda.length > 0 && (
          <QuestionBlock title="Za knjigovođu" items={handoff.knjigovoda} />
        )}
        {handoff.posrednik.length > 0 && (
          <QuestionBlock title="Za informacijskog posrednika" items={handoff.posrednik} />
        )}
      </div>
    </section>
  );
}

function QuestionBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="m-0 text-[16px] font-semibold text-[var(--ink)]">{title}</h3>
        <CopyList items={items} label="Kopiraj" />
      </div>
      <ul className="m-0 mt-4 list-none space-y-3 p-0">
        {items.map((q) => (
          <li key={q} className="flex gap-2.5 text-[15px] leading-relaxed text-[var(--ink-2)]">
            <span aria-hidden className="mt-[10px] h-[4px] w-[4px] shrink-0 rounded-full bg-[var(--ink-3)]" />
            {q}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Izvori ──────────────────────────────────────────────────────────────── */

function Sources({ assessedOn }: { assessedOn: string }) {
  return (
    <section className="mt-12 border-t border-[var(--line)] pt-8 print-break">
      <h2 className="m-0 text-[16px] font-semibold text-[var(--ink)]">Izvori</h2>
      <ul className="m-0 mt-3 list-none space-y-2 p-0 text-[14px]">
        {Object.values(SOURCES).map((s) => (
          <li key={s.id} className="text-[var(--ink-3)]">
            <a
              className="text-[var(--brand)] underline decoration-[var(--line-2)] underline-offset-[3px] hover:decoration-[var(--brand)]"
              href={s.url}
              target="_blank"
              rel="noreferrer"
            >
              {s.label}
            </a>
            <span className="ml-2">
              provjereno {formatHr(s.checkedOn)}
              {s.publisherUpdated ? `, izvor ažuriran ${formatHr(s.publisherUpdated)}` : ""}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-6 mb-0 text-[14px] leading-relaxed text-[var(--ink-3)]">
        Izvještaj je napravljen {formatHr(assessedOn)} na temelju vaših odgovora. Nije pravno ni
        porezno savjetovanje. Konačnu interpretaciju za vaš slučaj potvrđuje knjigovođa,
        informacijski posrednik ili Porezna uprava.
      </p>
      <p className="no-print mt-5 mb-0 text-[15px]">
        <Link className="text-[var(--brand)] underline underline-offset-[3px]" href="/provjera">
          Ponovi provjeru s drugim odgovorima
        </Link>
      </p>
    </section>
  );
}

/* ── Neispravna poveznica ────────────────────────────────────────────────── */

function Invalid() {
  return (
    <main className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="display m-0 text-[32px] text-[var(--ink)]">Poveznica nije čitljiva</h1>
      <p className="mt-4 mb-0 text-[17px] leading-relaxed text-[var(--ink-2)]">
        Izvještaj se ne može prikazati jer je poveznica nepotpuna ili izmijenjena. Radije ćemo
        vam reći ovo nego prikazati izvještaj koji možda ne odgovara vašim odgovorima.
      </p>
      <Link
        href="/provjera"
        className="mt-8 inline-block rounded-lg bg-[var(--brand)] px-6 py-3 text-[16px] font-semibold text-white no-underline hover:bg-[var(--brand-2)]"
      >
        Pokreni provjeru ponovno
      </Link>
    </main>
  );
}
