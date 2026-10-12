import { Scheda, Titolo } from "@/components/ui";

export default function Pagina() {
  return (
    <>
      <Titolo>Provvigioni</Titolo>
      <Scheda>
        <p className="text-testo-tenue">Maturate, disponibili, richieste e pagate, voce per voce. Pulsante &quot;Richiedi pagamento&quot; dal 10 al 13 del mese.</p>
        <p className="mt-4 inline-block rounded-full border border-oro/50 px-3 py-1 text-xs text-oro-chiaro">
          In arrivo nella Fase 6
        </p>
      </Scheda>
    </>
  );
}
