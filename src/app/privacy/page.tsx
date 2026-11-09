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
        <h2 id="clienti" className="pt-2 font-titoli text-xl text-oro-chiaro">Clienti del negozio online</h2>
        <p>
          Se acquisti dal negozio di una consulente G LUXE, nome, cognome, email, telefono e indirizzo servono a gestire
          l&apos;ordine, il pagamento (tramite Stripe) e la spedizione. Sono visibili all&apos;amministrazione, alla
          contabilità e, per la sola spedizione, a chi prepara gli ordini.
        </p>
        <p>
          Resti cliente della consulente da cui hai fatto il primo acquisto: lei vede il tuo nome e i tuoi ordini. Email
          e telefono li vede solo se ci dai il consenso con l&apos;apposita spunta; il consenso si revoca togliendo la
          spunta al prossimo ordine o scrivendo all&apos;azienda. Il tuo indirizzo non lo vede mai.
        </p>
        <p>Puoi chiedere in qualsiasi momento di consultare, correggere o cancellare i tuoi dati scrivendo all&apos;azienda.</p>
      </div>
    </PaginaPubblica>
  );
}
