import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase";
import { decodeAnswers } from "@/lib/codec";
import { evaluate } from "@/lib/rules/engine";
import { todayISO } from "@/lib/date";
import {
  clientIp,
  rateLimited,
  jsonError,
  validEmail,
  isHoneypot,
  text,
  readJson,
} from "@/lib/api-guard";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (rateLimited(`lead:${clientIp(request)}`)) {
    return jsonError("Previše pokušaja. Pokušajte ponovno za nekoliko minuta.", 429);
  }

  const body = await readJson(request);
  if (!body) return jsonError("Neispravan zahtjev.", 400);
  if (isHoneypot(body)) return NextResponse.json({ ok: true });

  const email = text(body.email, 254).toLowerCase();
  const name = text(body.name, 120);
  const phone = text(body.phone, 40);
  const token = text(body.token, 4000);

  if (!validEmail(email)) return jsonError("Unesite ispravnu e-mail adresu.", 400);
  if (body.consent !== true) return jsonError("Bez privole ne mogu poslati plan.", 400);

  // Sažetak se izvodi iz tokena na serveru, ne prima se od klijenta —
  // inače bi svatko mogao poslati izmišljenu ocjenu.
  const answers = decodeAnswers(token);
  const assessment = answers ? evaluate(answers, todayISO()) : null;

  const supabase = serverSupabase();
  if (!supabase) {
    console.warn("[lead] Supabase nije podešen; prijava nije spremljena:", email);
    return jsonError("Slanje trenutno nije dostupno. Javite se na ivan@faitech.hr.", 503);
  }

  const { error } = await supabase.from("leads").insert({
    email,
    name: name || null,
    phone: phone || null,
    answers_token: token || null,
    legal_form: answers?.legalForm ?? null,
    vat_status: answers?.vat ?? null,
    category: assessment?.profile.categoryLabel ?? null,
    overall: assessment?.overall ?? null,
    score: assessment?.score ?? null,
    critical_count: assessment?.counts.kriticno ?? null,
    risk_count: assessment?.counts.rizik ?? null,
    source: "eracun-semafor",
  });

  if (error) {
    // Ponovljena prijava iste adrese nije greška za korisnika.
    if (error.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    console.error("[lead] neuspješan upis:", error.message);
    return jsonError("Došlo je do greške. Javite se na ivan@faitech.hr.", 500);
  }

  return NextResponse.json({ ok: true });
}
