import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase";
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
  if (rateLimited(`partner:${clientIp(request)}`)) {
    return jsonError("Previše pokušaja. Pokušajte ponovno za nekoliko minuta.", 429);
  }

  const body = await readJson(request);
  if (!body) return jsonError("Neispravan zahtjev.", 400);
  if (isHoneypot(body)) return NextResponse.json({ ok: true });

  const email = text(body.email, 254).toLowerCase();
  if (!validEmail(email)) return jsonError("Unesite ispravnu e-mail adresu.", 400);
  if (body.consent !== true) return jsonError("Bez privole ne mogu zaprimiti zahtjev.", 400);

  const supabase = serverSupabase();
  if (!supabase) {
    console.warn("[partner] Supabase nije podešen; zahtjev nije spremljen:", email);
    return jsonError(
      "Zahtjev trenutno ne mogu zaprimiti. Pišite izravno na ivan@faitech.hr.",
      503,
    );
  }

  const { error } = await supabase.from("partners").insert({
    email,
    name: text(body.name, 120) || null,
    company: text(body.company, 160) || null,
    phone: text(body.phone, 40) || null,
    client_count: text(body.clientCount, 40) || null,
    message: text(body.message, 2000) || null,
  });

  if (error) {
    if (error.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
    console.error("[partner] neuspješan upis:", error.message);
    return jsonError("Došlo je do greške. Pišite na ivan@faitech.hr.", 500);
  }

  return NextResponse.json({ ok: true });
}
