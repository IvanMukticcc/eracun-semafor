import { notFound } from "next/navigation";
import { timingSafeEqual } from "node:crypto";
import type { Metadata } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { serverSupabase } from "@/lib/supabase";
import { OFFERS, type ProductId } from "@/lib/offers";
import { AREA_LABEL } from "@/lib/labels";
import { lijevak, kriticniTest, KRITICNI_TEST_PRAG } from "@/lib/funnel";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Usporedba otporna na mjerenje vremena; ključ nikad ne curi kroz trajanje. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface OrderRow {
  id: string;
  created_at: string;
  product: ProductId;
  status: string;
  price_cents: number;
  email: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  overall: string | null;
  critical_count: number | null;
  answers_token: string | null;
  message: string | null;
}

interface PartnerRow {
  id: string;
  created_at: string;
  email: string;
  name: string | null;
  company: string | null;
  client_count: string | null;
  status: string;
}

interface LeadRow {
  id: string;
  created_at: string;
  email: string;
  name: string | null;
  category: string | null;
  overall: string | null;
  critical_count: number | null;
}

interface AssessmentRow {
  overall: string | null;
  legal_form: string | null;
  vat_status: string | null;
  finding_ids: string[] | null;
}

export default async function OpsPage({
  searchParams,
}: {
  searchParams: Promise<{ k?: string }>;
}) {
  const expected = process.env.OPS_TOKEN;
  const provided = (await searchParams).k ?? "";

  // Bez postavljenog ključa stranica ne postoji. Bolje nego prazna zaštita.
  if (!expected || expected.length < 16 || !secretMatches(provided, expected)) notFound();

  const supabase = serverSupabase();
  if (!supabase) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="display m-0 text-[30px]">Baza nije spojena</h1>
        <p className="mt-4 text-[17px] text-[var(--ink-2)]">
          Postavite <code>SUPABASE_URL</code> i <code>SUPABASE_SERVICE_ROLE_KEY</code>, pa
          pustite migracije iz <code>supabase/migrations/</code>.
        </p>
      </main>
    );
  }

  const [orders, partners, leads, assessments] = await Promise.all([
    supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100),
    supabase.from("partners").select("*").order("created_at", { ascending: false }).limit(50),
    supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(50),
    supabase
      .from("assessments")
      .select("overall,legal_form,vat_status,finding_ids")
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);

  const o = (orders.data ?? []) as OrderRow[];
  const p = (partners.data ?? []) as PartnerRow[];
  const l = (leads.data ?? []) as LeadRow[];
  const a = (assessments.data ?? []) as AssessmentRow[];

  const errors = [orders.error, partners.error, leads.error, assessments.error].filter(Boolean);

  // Postotci se broje u bazi, ne u dohvaćenim redcima. Tablice gore su
  // namjerno ograničene (1000/100/50), pa bi omjer iz duljine polja tiho
  // postao kriv čim promet naraste — a to je upravo trenutak kad brojke
  // počinju nešto značiti.
  const [
    provjere,
    provjereKriticne,
    provjereUredne,
    provjereNePdv,
    prijave,
    zahtjevi,
    zahtjeviAudit,
    placeniAuditi,
    placeniSetupi,
    placeniSvi,
  ] = await Promise.all([
    tally(supabase, "assessments"),
    tally(supabase, "assessments", { overall: "kriticno" }),
    tally(supabase, "assessments", { overall: "ok" }),
    tally(supabase, "assessments", { vat_status: "ne" }),
    tally(supabase, "leads"),
    tally(supabase, "orders"),
    tally(supabase, "orders", { product: "audit" }),
    tally(supabase, "orders", { product: "audit", status: "placeno" }),
    tally(supabase, "orders", { product: "setup", status: "placeno" }),
    tally(supabase, "orders", { status: "placeno" }),
  ]);

  // Prihod se i dalje zbraja iz redaka: zadnjih 100 narudžbi pokriva svaki
  // stvarni iznos u ovoj fazi, a zbroj cijena se ne može dobiti brojanjem.
  const paid = o.filter((x) => x.status === "placeno");
  const revenueCents = paid.reduce((sum, x) => sum + x.price_cents, 0);

  const mjere = lijevak({
    provjere,
    provjereKriticne,
    provjereUredne,
    prijave,
    zahtjevi,
    zahtjeviAudit,
    placeniSvi,
    placeniAuditi,
    placeniSetupi,
  });
  const klin = kriticniTest(provjereUredne, provjere);

  // Koji je propust najčešći u populaciji — ulaz za iduću verziju ponude.
  const findingTally = new Map<string, number>();
  for (const row of a) {
    for (const id of row.finding_ids ?? []) {
      findingTally.set(id, (findingTally.get(id) ?? 0) + 1);
    }
  }
  const topFindings = [...findingTally.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <h1 className="display m-0 text-[32px] text-[var(--ink)]">Operativa</h1>
      <p className="mt-2 mb-0 text-[15px] text-[var(--ink-3)]">
        Brojke i lijevak računaju se iz cijele baze. Tablice niže prikazuju zadnjih 100 narudžbi,
        50 prijava, 50 partnera i 1000 provjera.
      </p>

      {errors.length > 0 && (
        <p className="mt-5 rounded-md border border-[var(--kriticno-line)] bg-[var(--kriticno-bg)] px-4 py-3 text-[14px] text-[var(--kriticno)]">
          Neki upiti nisu prošli — jesu li migracije puštene? {errors.map((e) => e!.message).join(" · ")}
        </p>
      )}

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Provjere" value={provjere} />
        <Stat label="S kritičnim" value={provjereKriticne} note={pct(provjereKriticne, provjere)} />
        <Stat label="Izvan PDV-a" value={provjereNePdv} note={pct(provjereNePdv, provjere)} />
        <Stat label="Prijave" value={prijave} note={pct(prijave, provjere)} />
        <Stat label="Zahtjevi" value={zahtjevi} note={pct(zahtjevi, provjere)} />
        <Stat
          label="Plaćeno"
          value={`${(revenueCents / 100).toFixed(0)} €`}
          note={`${placeniSvi} ${placeniSvi === 1 ? "narudžba" : "narudžbi"}`}
        />
      </section>

      {/* ── Kritični test ────────────────────────────────────────────────────
          Prije svih ostalih metrika. Ako većina provjera izađe uredna, klin ne
          postoji kako je zamišljen i gradi se pogrešna stvar. Alat namjerno
          urednom obvezniku kaže da nema otvorenih koraka i odbija naplatu —
          zato je ovaj udio pošten pokazatelj, a ne posljedica blagih pravila. */}
      <section className="mt-6 rounded-lg border border-[var(--line)] px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="m-0 text-[15px] font-semibold text-[var(--ink)]">
            Kritični test: udio provjera bez ijednog otvorenog koraka
          </h2>
          <p className="tnum m-0 text-[15px] font-semibold text-[var(--ink)]">
            {klin.udio === null ? "—" : `${Math.round(klin.udio)}%`}
            <span className="ml-2 text-[13px] font-normal text-[var(--ink-3)]">
              cilj: ispod {KRITICNI_TEST_PRAG} %
            </span>
          </p>
        </div>
        <p className="mt-2 mb-0 text-[14px] leading-relaxed text-[var(--ink-3)]">
          {klin.prolazi === null ? (
            <>Premalo podataka — treba barem 20 provjera, sada ih je {provjere}.</>
          ) : klin.prolazi ? (
            <>Klin stoji: većina obveznika koji prođu provjeru ima što popraviti.</>
          ) : (
            <>
              Iznad praga. Većina obveznika je uredna, pa ovaj klin možda ne postoji —
              prije daljnjeg ulaganja pročitati <code>briefs/2026-09-03-monetizacija.md</code>,
              odjeljak 4.
            </>
          )}
        </p>
      </section>

      <Section title="Lijevak">
        <Table head={["Metrika", "Sada", "Hipoteza", "Ocjena"]}>
          {mjere.map((m) => (
            <tr key={m.id} className="border-t border-[var(--line)] align-top">
              <Td>
                <span className="font-medium text-[var(--ink)]">{m.naziv}</span>
                {(m.stanje === "ispod" || m.stanje === "iznad") && (
                  <span className="mt-0.5 block text-[var(--ink-3)]">{m.akoPadne}</span>
                )}
              </Td>
              <Td>
                <span className="tnum">
                  {m.udio === null ? "—" : `${Math.round(m.udio)}%`}
                </span>
                <span className="tnum block text-[var(--ink-3)]">
                  {m.brojnik} / {m.nazivnik}
                </span>
              </Td>
              <Td>
                <span className="tnum">
                  {m.min}–{m.max} %
                </span>
              </Td>
              <Td>
                <Badge>{m.stanje === "premalo" ? "premalo podataka" : m.stanje}</Badge>
              </Td>
            </tr>
          ))}
        </Table>
        <p className="mt-4 mb-0 text-[14px] leading-relaxed text-[var(--ink-3)]">
          Rasponi u stupcu „Hipoteza” su <strong>pretpostavke, ne podaci</strong> — zapisane su u
          <code> briefs/2026-09-03-monetizacija.md</code> da bi se mogle opovrgnuti. Ispod praga
          uzorka ocjena se ne prikazuje, jer postotak iz tri mjerenja ne znači ništa.
        </p>
      </Section>

      <Section title="Zahtjevi za uslugu">
        {o.length === 0 ? (
          <Empty>Još nijedan zahtjev.</Empty>
        ) : (
          <Table head={["Kad", "Usluga", "Status", "Tko", "Kontakt", "Nalaz"]}>
            {o.map((row) => (
              <tr key={row.id} className="border-t border-[var(--line)] align-top">
                <Td>{when(row.created_at)}</Td>
                <Td>
                  <span className="font-medium">{OFFERS[row.product]?.name ?? row.product}</span>
                  <span className="block text-[var(--ink-3)]">
                    {(row.price_cents / 100).toFixed(0)} €
                  </span>
                </Td>
                <Td>
                  <Badge>{row.status}</Badge>
                </Td>
                <Td>
                  {row.name ?? "—"}
                  <span className="block text-[var(--ink-3)]">{row.company ?? ""}</span>
                </Td>
                <Td>
                  <a className="text-[var(--brand)]" href={`mailto:${row.email}`}>
                    {row.email}
                  </a>
                  <span className="block text-[var(--ink-3)]">{row.phone ?? ""}</span>
                </Td>
                <Td>
                  {row.overall ?? "—"}
                  {row.critical_count ? (
                    <span className="block text-[var(--kriticno)]">
                      {row.critical_count} kritično
                    </span>
                  ) : null}
                  {row.answers_token && (
                    <a
                      className="block text-[var(--brand)]"
                      href={`/rezultat?a=${row.answers_token}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      izvještaj →
                    </a>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Knjigovodstveni uredi">
        {p.length === 0 ? (
          <Empty>Još nijedan partner.</Empty>
        ) : (
          <Table head={["Kad", "Ured", "Klijenata", "Kontakt", "Status"]}>
            {p.map((row) => (
              <tr key={row.id} className="border-t border-[var(--line)] align-top">
                <Td>{when(row.created_at)}</Td>
                <Td>
                  {row.company ?? "—"}
                  <span className="block text-[var(--ink-3)]">{row.name ?? ""}</span>
                </Td>
                <Td>{row.client_count ?? "—"}</Td>
                <Td>
                  <a className="text-[var(--brand)]" href={`mailto:${row.email}`}>
                    {row.email}
                  </a>
                </Td>
                <Td>
                  <Badge>{row.status}</Badge>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Prijave za plan">
        {l.length === 0 ? (
          <Empty>Još nijedna prijava.</Empty>
        ) : (
          <Table head={["Kad", "Tko", "Kategorija", "Nalaz"]}>
            {l.map((row) => (
              <tr key={row.id} className="border-t border-[var(--line)] align-top">
                <Td>{when(row.created_at)}</Td>
                <Td>
                  <a className="text-[var(--brand)]" href={`mailto:${row.email}`}>
                    {row.email}
                  </a>
                  <span className="block text-[var(--ink-3)]">{row.name ?? ""}</span>
                </Td>
                <Td>{row.category ?? "—"}</Td>
                <Td>
                  {row.overall ?? "—"}
                  {row.critical_count ? (
                    <span className="block text-[var(--kriticno)]">
                      {row.critical_count} kritično
                    </span>
                  ) : null}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Najčešći nalazi">
        {topFindings.length === 0 ? (
          <Empty>Nema još dovoljno provjera.</Empty>
        ) : (
          <ul className="m-0 list-none p-0">
            {topFindings.map(([id, count]) => (
              <li
                key={id}
                className="flex items-center justify-between gap-4 border-b border-[var(--line)] py-2.5 text-[15px]"
              >
                <span className="text-[var(--ink-2)]">{id}</span>
                <span className="tnum shrink-0 text-[var(--ink-3)]">
                  {count} · {pct(count, a.length)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 mb-0 text-[14px] leading-relaxed text-[var(--ink-3)]">
          Nalaz koji se ponavlja kod većine je kandidat za sljedeći proizvod — ali tek nakon
          pet plaćenih audita, po pravilu iz AGENTS.md. Područja: {Object.values(AREA_LABEL).join(", ")}.
        </p>
      </Section>
    </main>
  );
}

/* ── Mjerenje ────────────────────────────────────────────────────────────── */


/**
 * Broji redke u bazi umjesto u dohvaćenom polju. `head: true` ne vraća
 * nijedan red, pa je jeftino i onda kad tablica naraste.
 */
async function tally(
  supabase: SupabaseClient,
  table: string,
  filters: Record<string, string> = {},
): Promise<number> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);

  const { count, error } = await query;
  // Neuspjelo brojanje ne smije srušiti ploču; nula je vidljiva kao „premalo
  // podataka”, a stvarna greška se ionako javlja iznad, iz glavnih upita.
  if (error) console.error(`[ops] brojanje ${table} nije prošlo:`, error.message);
  return count ?? 0;
}

/* ── Sitni dijelovi ──────────────────────────────────────────────────────── */

const pct = (n: number, total: number) => (total === 0 ? "—" : `${Math.round((n / total) * 100)}%`);

const when = (iso: string) =>
  new Intl.DateTimeFormat("hr-HR", {
    timeZone: "Europe/Zagreb",
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));

function Stat({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] px-4 py-3">
      <p className="tnum m-0 text-[24px] font-semibold leading-none text-[var(--ink)]">{value}</p>
      <p className="m-0 mt-1.5 text-[13px] font-medium text-[var(--ink-2)]">{label}</p>
      {note && <p className="tnum m-0 text-[12px] text-[var(--ink-3)]">{note}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="m-0 mb-4 text-[18px] font-semibold text-[var(--ink)]">{title}</h2>
      {children}
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--line)]">
      <table className="w-full min-w-[720px] border-collapse text-[14px]">
        <thead>
          <tr className="bg-[var(--surface-2)] text-left">
            {head.map((h) => (
              <th
                key={h}
                className="px-3.5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--ink-3)]"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

const Td = ({ children }: { children: React.ReactNode }) => (
  <td className="px-3.5 py-3 text-[var(--ink-2)]">{children}</td>
);

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-md bg-[var(--surface-3)] px-2 py-0.5 text-[13px] font-medium text-[var(--ink-2)]">
    {children}
  </span>
);

const Empty = ({ children }: { children: React.ReactNode }) => (
  <p className="m-0 rounded-lg border border-dashed border-[var(--line-2)] px-5 py-8 text-center text-[15px] text-[var(--ink-3)]">
    {children}
  </p>
);
