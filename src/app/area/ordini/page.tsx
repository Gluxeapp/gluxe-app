import { Scheda, Titolo } from "@/components/ui";

export default function Pagina() {
  return (
    <>
      <Titolo>Ordini</Titolo>
      <Scheda>
        <p className="text-testo-tenue">Nuovo ordine con pagamento con carta, PayPal o Klarna, ed elenco dei tuoi ordini con il loro stato.</p>
        <p className="mt-4 inline-block rounded-full border border-oro/50 px-3 py-1 text-xs text-oro-chiaro">
          In arrivo nella Fase 3
        </p>
      </Scheda>
    </>
  );
}
