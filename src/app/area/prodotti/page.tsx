import { Scheda, Titolo } from "@/components/ui";

export default function Pagina() {
  return (
    <>
      <Titolo>Prodotti</Titolo>
      <Scheda>
        <p className="text-testo-tenue">Listino e promozioni del momento.</p>
        <p className="mt-4 inline-block rounded-full border border-oro/50 px-3 py-1 text-xs text-oro-chiaro">
          In arrivo nella Fase 2
        </p>
      </Scheda>
    </>
  );
}
