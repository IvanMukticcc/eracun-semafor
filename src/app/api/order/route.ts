import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase";
import { decodeAnswers } from "@/lib/codec";
import { evaluate } from "@/lib/rules/engine";
import { todayISO } from "@/lib/date";
import { OFFERS, type ProductId } from "@/lib/offers";
import {
  clientIp,
  rateLimited,
  jsonError,
  validEmail,
  validOib,
  isHoneypot,
  text,
  readJson,
} from "@/lib/api-guard";

export const runtime = "nodejs";

const VALID: ProductId[] = ["audit", "setup", "monitor", "partner"];

export async function POST(request: Request) {
  if (rateLimited(`order:${clientIp(request)}`)) {
    return jsonError("Previše pokušaja. Pokušajte ponovno za nekoliko minuta.", 429);
  }

  const body = await readJson(request);
  if (!body) return jsonError("Neispravan zahtjev.", 400);
  if (isHoneypot(body)) return NextResponse.json({ ok: true });

  const product = String(body.product ?? "") as ProductId;
  if (!VALID.includes(product)) return jsonError("Nepoznata usluga.", 400);

  const email = text(body.email, 254).toLowerCase();
  if (!validEmail(email)) return jsonError("Unesite ispravnu e-mail adresu.", 400);

  const oib = text(body.oib, 11);
  if (oib && !validOib(oib)) return jsonError("OIB mora imati 11 znamenki.", 400);

  if (body.consent !== true) return jsonError("Bez privole ne mogu zaprimiti zahtjev.", 400);

  // Cijena dolazi iz kataloga na serveru, nikad iz zahtjeva — inače bi si
  // svatko mogao odrediti svoju.
  const offer = OFFERS[product];

  // Isto vrijedi za sažetak nalaza: izvodi se iz tokena, ne prima se gotov.
  const token = text(body.token, 4000);
  const answers = decodeAnswers(token);
  const assessment = answers ? evaluate(answers, todayISO()) : null;

  const supabase = serverSupabase();
  if (!supabase) {
    console.warn("[order] Supabase nije podešen; zahtjev nije spremljen:", product, email);
    return jsonError(
      "Zahtjev trenutno ne mogu zaprimiti. Pišite izravno na ivan@faitech.hr — javljam se isti dan.",
      503,
    );
  }

  const { error } = await supabase.from("orders").insert({
    product,
    price_cents: offer.priceCents,
    email,
    name: text(body.name, 120) || null,
    phone: text(body.phone, 40) || null,
    company: text(body.company, 160) || null,
    oib: oib || null,
    message: text(body.message, 2000) || null,
    answers_token: token || null,
    overall: assessment?.overall ?? null,
    score: assessment?.score ?? null,
    critical_count: assessment?.counts.kriticno ?? null,
    risk_count: assessment?.counts.rizik ?? null,
    legal_form: answers?.legalForm ?? null,
    vat_status: answers?.vat ?? null,
  });

  if (error) {
    console.error("[order] neuspješan upis:", error.message);
    return jsonError("Došlo je do greške. Pišite na ivan@faitech.hr.", 500);
  }

  return NextResponse.json({ ok: true });
}
