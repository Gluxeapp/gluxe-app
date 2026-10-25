import Link from "next/link";

/** Linguette Listino / Promozioni. */
export function Schede({ attiva, promoInCorso }: { attiva: "listino" | "promo"; promoInCorso?: number }) {
  const classe = (s: string) =>
    `flex-1 rounded-lg py-2 text-center text-sm ${attiva === s ? "bg-oro font-semibold text-nero" : "text-testo-tenue"}`;
  return (
    <nav aria-label="Catalogo" className="mb-5 flex gap-2 rounded-xl border border-bordo bg-superficie p-1">
      <Link href="/area/prodotti" className={classe("listino")} aria-current={attiva === "listino" ? "page" : undefined}>
        Listino
      </Link>
      <Link href="/area/prodotti/promozioni" className={classe("promo")} aria-current={attiva === "promo" ? "page" : undefined}>
        Promozioni{promoInCorso ? ` (${promoInCorso})` : ""}
      </Link>
    </nav>
  );
}
