import { Avviso, PaginaPubblica, Titolo } from "@/components/ui";

export const metadata = { title: "Informativa privacy · G LUXE" };

export default function Privacy() {
  return (
    <PaginaPubblica>
      <Titolo>Informativa privacy</Titolo>
      <Avviso>
        Testo provvisorio. L&apos;informativa definitiva sarà fornita da G LUXE e verificata dal consulente legale prima
        del lancio.
      </Avviso>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-testo-tenue">
        <p>
          I dati che inserisci (anagrafica, contatti, IBAN) servono a gestire il rapporto di incaricata alle vendite:
          ordini, provvigioni, pagamenti e adempimenti fiscali.
        </p>
        <p>
          Sono conservati su server nell&apos;Unione Europea e sono visibili solo all&apos;amministrazione e alla
          contabilità di G LUXE. Il tuo sponsor e la tua rete vedono solo nome, qualifica e volumi; telefono ed email
          solo il tuo sponsor diretto.
        </p>
        <p>Puoi chiedere in qualsiasi momento di consultare, correggere o cancellare i tuoi dati scrivendo all&apos;azienda.</p>
      </div>
    </PaginaPubblica>
  );
}
