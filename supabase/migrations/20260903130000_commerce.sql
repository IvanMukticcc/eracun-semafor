-- Komercijalni sloj: narudžbe, pretplatnici na monitor, knjigovodstveni partneri.
--
-- Nijedna tablica ne prima upis iz preglednika. RLS je uključen bez ijedne
-- policy, pa anon i authenticated ključ ne mogu ništa; sve ide kroz server
-- route sa service role ključem.

-- ── Narudžbe ────────────────────────────────────────────────────────────────
-- Zahtjev za plaćenom uslugom. Nastaje u trenutku najveće motivacije kupca —
-- odmah nakon izvještaja — pa nosi i snimku nalaza koji su ga naveli da klikne.

create type public.order_product as enum ('audit', 'setup', 'monitor', 'partner');
create type public.order_status as enum (
  'zatrazeno',    -- kupac je poslao zahtjev
  'kvalificiran', -- obavljen uvodni razgovor, ima smisla
  'racun_poslan',
  'placeno',
  'isporuceno',
  'odbijeno',     -- ne mogu pomoći, ne naplaćujem
  'otkazano'
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  product public.order_product not null,
  status public.order_status not null default 'zatrazeno',

  -- Cijena u centima, da se izbjegne aritmetika s pomičnim zarezom.
  price_cents int not null check (price_cents >= 0),
  currency text not null default 'EUR' check (currency = 'EUR'),

  email text not null,
  name text,
  phone text,
  company text,
  oib text,

  -- Snimka izvještaja u trenutku narudžbe. Poveznica se može ponovno otvoriti,
  -- a sažetak ostaje čitljiv i ako se pravila kasnije promijene.
  answers_token text,
  overall text,
  score int,
  critical_count int,
  risk_count int,
  legal_form text,
  vat_status text,

  message text,
  note text,

  -- Popunjava se tek kad postoji naplata preko pružatelja plaćanja.
  payment_provider text,
  payment_ref text,
  paid_at timestamptz,

  constraint orders_email_format check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'),
  constraint orders_oib_format check (oib is null or oib ~ '^[0-9]{11}$'),
  constraint orders_overall_valid check (overall is null or overall in ('kriticno','rizik','provjeri','ok')),
  constraint orders_score_range check (score is null or (score between 0 and 100)),
  constraint orders_paid_has_ref check (status <> 'placeno' or paid_at is not null)
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_product_idx on public.orders (product);
create index if not exists orders_email_idx on public.orders (lower(email));

-- ── Knjigovodstveni partneri ────────────────────────────────────────────────
-- Knjigovođa koji je vidio izvještaj svog klijenta i želi isto za sve klijente.
-- Ovo je kanal s najvećom polugom: jedan ured pokriva 50-200 obveznika.

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  email text not null,
  name text,
  company text,
  phone text,

  -- Koliko klijenata vodi — određuje veličinu ponude.
  client_count text,
  message text,
  status text not null default 'novi',
  note text,

  constraint partners_email_format check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$')
);

create unique index if not exists partners_email_key on public.partners (lower(email));
create index if not exists partners_created_at_idx on public.partners (created_at desc);

-- ── Ponovna ocjena ──────────────────────────────────────────────────────────
-- Zapis svakog dovršenog izvještaja, bez osobnih podataka. Služi da se zna
-- koji segment dolazi i koji su nalazi najčešći — to je ulaz za sljedeću
-- verziju ponude, i jedini način da se vidi gdje lijevak curi.

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  legal_form text,
  vat_status text,
  category text,
  overall text,
  score int,
  critical_count int,
  risk_count int,
  volume text,
  -- Popis id-eva nalaza; pokazuje koji propust je najčešći u populaciji.
  finding_ids text[],

  constraint assessments_score_range check (score is null or (score between 0 and 100))
);

create index if not exists assessments_created_at_idx on public.assessments (created_at desc);
create index if not exists assessments_overall_idx on public.assessments (overall);

-- ── updated_at ──────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at
  before update on public.orders
  for each row execute function public.touch_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────

alter table public.orders enable row level security;
alter table public.partners enable row level security;
alter table public.assessments enable row level security;

comment on table public.orders is 'Zahtjevi za plaćenim uslugama. Upis samo preko servera (service role).';
comment on table public.partners is 'Knjigovodstveni uredi zainteresirani za partnerski program.';
comment on table public.assessments is 'Anonimna statistika dovršenih provjera; ulaz za iduću verziju ponude.';
