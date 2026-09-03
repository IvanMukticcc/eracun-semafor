import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase";
import { decodeAnswers } from "@/lib/codec";
import { evaluate } from "@/lib/rules/engine";
import { todayISO } from "@/lib/date";
import { clientIp, rateLimited, jsonError, text, readJson } from "@/lib/api-guard";

export const runtime = "nodejs";

/**
 * Anonimna statistika dovršenih provjera. Bez e-maila, bez imena, bez IP-a —
 * samo profil i nalazi, da se vidi koji segment dolazi i koji je propust
 * najčešći. To je jedini način da se zna gdje lijevak curi.
 */
export async function POST(request: Request) {
  if (rateLimited(`assessment:${clientIp(request)}`, 30)) {
    return NextResponse.json({ ok: true });
  }

  const body = await readJson(request);
  if (!body) return jsonError("Neispravan zahtjev.", 400);

  const answers = decodeAnswers(text(body.token, 4000));
  if (!answers) return jsonError("Neispravan token.", 400);

  const supabase = serverSupabase();
  if (!supabase) return NextResponse.json({ ok: true, stored: false });

  const assessment = evaluate(answers, todayISO());

  const { error } = await supabase.from("assessments").insert({
    legal_form: answers.legalForm,
    vat_status: answers.vat,
    category: assessment.profile.categoryLabel,
    overall: assessment.overall,
    score: assessment.score,
    critical_count: assessment.counts.kriticno,
    risk_count: assessment.counts.rizik,
    volume: answers.volume,
    finding_ids: assessment.findings.map((f) => f.id),
  });

  if (error) console.error("[assessment] neuspješan upis:", error.message);
  return NextResponse.json({ ok: true, stored: !error });
}
