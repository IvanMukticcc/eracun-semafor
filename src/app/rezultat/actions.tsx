"use client";

import { useState } from "react";

export function ReportActions({ reportText }: { reportText: string }) {
  const [copied, setCopied] = useState<"link" | "text" | null>(null);

  async function copy(what: "link" | "text") {
    const value =
      what === "link"
        ? window.location.href
        : `${reportText}\n\nIzvještaj: ${window.location.href}`;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      setTimeout(() => setCopied(null), 2200);
    } catch {
      // Neki preglednici blokiraju clipboard bez HTTPS-a; tada barem označimo tekst.
      window.prompt("Kopirajte ručno:", value);
    }
  }

  return (
    <div className="no-print flex flex-wrap items-center gap-2.5">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-4 py-2.5 text-[15px] font-medium text-[var(--ink-2)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
      >
        Ispiši ili spremi kao PDF
      </button>
      <button
        type="button"
        onClick={() => copy("link")}
        className="rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-4 py-2.5 text-[15px] font-medium text-[var(--ink-2)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
      >
        {copied === "link" ? "Poveznica kopirana ✓" : "Kopiraj poveznicu"}
      </button>
      <button
        type="button"
        onClick={() => copy("text")}
        className="rounded-lg border border-[var(--line-2)] bg-[var(--surface)] px-4 py-2.5 text-[15px] font-medium text-[var(--ink-2)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
      >
        {copied === "text" ? "Tekst kopiran ✓" : "Kopiraj kao tekst za e-mail"}
      </button>
    </div>
  );
}

export function CopyList({ items, label }: { items: string[]; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(items.map((q) => `– ${q}`).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Kopirajte ručno:", items.join("\n"));
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="no-print rounded-md border border-[var(--line-2)] px-3 py-1.5 text-[13px] font-medium text-[var(--ink-3)] transition-colors hover:border-[var(--brand)] hover:text-[var(--brand)]"
    >
      {copied ? "Kopirano ✓" : label}
    </button>
  );
}
