"use client";

/** Zajednički dijelovi obrazaca. Isti izgled i ista pravila na sva tri mjesta. */

export function Field({
  label,
  name,
  type = "text",
  required,
  autoComplete,
  placeholder,
  inputMode,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel" | "email";
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="block text-[14px] font-medium text-[var(--ink-2)]">
        {label}
        {required && <span className="text-[var(--kriticno)]"> *</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength ?? (type === "email" ? 254 : 160)}
        className="mt-1.5 w-full rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-2.5 text-[16px] text-[var(--ink)] outline-none transition-colors focus:border-[var(--brand)]"
      />
    </label>
  );
}

export function TextArea({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-[14px] font-medium text-[var(--ink-2)]">{label}</span>
      <textarea
        name={name}
        rows={3}
        maxLength={2000}
        placeholder={placeholder}
        className="mt-1.5 w-full resize-y rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-3.5 py-2.5 text-[16px] text-[var(--ink)] outline-none transition-colors focus:border-[var(--brand)]"
      />
    </label>
  );
}

/** Mamac za botove — izvan dosega miša, tipkovnice i čitača ekrana. */
export function Honeypot() {
  return (
    <input
      type="text"
      name="website"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden
      style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }}
    />
  );
}

export function Consent({ children }: { children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-relaxed text-[var(--ink-2)]">
      <input
        type="checkbox"
        name="consent"
        required
        className="mt-[5px] h-[17px] w-[17px] shrink-0 accent-[var(--brand)]"
      />
      <span>{children}</span>
    </label>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="m-0 rounded-md border border-[var(--kriticno-line)] bg-[var(--kriticno-bg)] px-4 py-3 text-[15px] text-[var(--kriticno)]"
    >
      {children}
    </p>
  );
}

/** Jedno mjesto za slanje obrasca, da se rukovanje greškama ne razilazi. */
export async function submitForm(
  endpoint: string,
  payload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json.error ?? "Došlo je do greške." };
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "Nema veze sa serverom. Pokušajte ponovno ili pišite na ivan@faitech.hr.",
    };
  }
}
