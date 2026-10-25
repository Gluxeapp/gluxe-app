const colori: Record<string, string> = {
  inserito: "border-errore/50 text-errore",
  annullato: "border-bordo text-testo-tenue",
  reso: "border-bordo text-testo-tenue",
};

export function EtichettaStato({ stato, etichetta }: { stato: string; etichetta: string }) {
  return (
    <span
      className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[11px] ${colori[stato] ?? "border-oro/50 text-oro-chiaro"}`}
    >
      {etichetta}
    </span>
  );
}
