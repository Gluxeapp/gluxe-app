import { Scheda, Titolo } from "@/components/ui";

export default function Pagina() {
  return (
    <>
      <Titolo>Carriera</Titolo>
      <Scheda>
        <p className="text-testo-tenue">Qualifica del mese, punti mancanti per la prossima, avanzamento e l&apos;albero della tua rete.</p>
        <p className="mt-4 inline-block rounded-full border border-oro/50 px-3 py-1 text-xs text-oro-chiaro">
          In arrivo nella Fase 5
        </p>
      </Scheda>
    </>
  );
}
