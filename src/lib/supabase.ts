import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side klijent sa service role ključem. Nikad se ne smije uvesti u
 * komponentu koja se izvodi u pregledniku.
 *
 * Vraća `null` kad okolina nije podešena, umjesto da baci. Obrazac za prijavu
 * tada i dalje radi i javlja korisniku pošteno stanje, a ne bijeli ekran.
 */
let cached: SupabaseClient | null | undefined;

export function serverSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  cached = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return cached;
}

export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
