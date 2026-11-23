import { Suspense } from "react";
import { Avviso, Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediCliente } from "@/lib/accesso";
import { candidaturaAperta, datiGuadagna } from "@/lib/profilo-cliente";
import { ModuloCandidatura } from "./modulo";

export const metadata = { title: "Guadagna con G LUXE · Clienti G LUXE" };

/** "Guadagna con G LUXE": le possibilità dell'attività di incaricata e la candidatura, che arriva alla sede. */
export default function Guadagna() {
  return (
    <>
      <Titolo sottotitolo="Ami i prodotti G LUXE? Puoi consigliarli alle persone che conosci e guadagnare, con i tempi che scegli tu.">
        Guadagna con G LUXE
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

async function Contenuto() {
  const { cliente } = await richiediCliente();
  const [d, aperta] = await Promise.all([datiGuadagna(), candidaturaAperta(cliente.id)]);

  return (
    <div className="grid gap-4">
      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">Compri con il {d.sconto} di sconto</h2>
        <p className="mt-2 text-sm">
          Come incaricata acquisti tutti i prodotti a listino con il {d.sconto} di sconto, per te o per rivenderli.
          {d.esempio && (
            <>
              {" "}
              Per esempio {d.esempio.nome}: <span className="text-testo-tenue line-through">{d.esempio.listino}</span>{" "}
              <span className="font-semibold text-oro-chiaro">{d.esempio.scontato}</span>.
            </>
          )}
        </p>
      </Scheda>

      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">Il tuo negozio online</h2>
        <p className="mt-2 text-sm">
          Ogni incaricata ha un negozio online personale da condividere con un link. Le sue clienti comprano da lì e pagano
          direttamente online; lei riceve una provvigione del {d.provvigioneOnline} dei punti di ogni ordine.
          {d.esempio && (
            <>
              {" "}
              Su un {d.esempio.nome} venduto a {d.esempio.listino}, la provvigione è di {d.esempio.provvigione}.
            </>
          )}{" "}
          Spedizioni e pagamenti li gestisce l&apos;azienda.
        </p>
      </Scheda>

      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">Una carriera che cresce con te</h2>
        <p className="mt-2 text-sm">
          Puoi presentare G LUXE ad altre persone e creare la tua squadra. Più crescono i punti del gruppo nel mese, più sale la
          percentuale che ricevi:
        </p>
        <ul className="mt-3 divide-y divide-bordo text-sm">
          {d.qualifiche.map((q) => (
            <li key={q.nome} className="flex justify-between gap-3 py-2">
              <span>
                <span className="font-semibold text-oro-chiaro">{q.nome}</span>{" "}
                <span className="text-testo-tenue">da {q.soglia} punti di gruppo</span>
              </span>
              <span>{q.percentuale}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-testo-tenue">
          Per le Leader ci sono anche premi sulle squadre più grandi
          {d.bonusAutoMassimo ? `, quote del pool e un bonus auto fino a ${d.bonusAutoMassimo} al mese` : " e quote del pool"}.
        </p>
      </Scheda>

      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">Come si inizia</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {d.startKit && (
            <li>
              Lo start kit costa {d.startKit}: contiene prodotti, borsa campionario e materiale formativo, e vale {d.puntiStartKit} punti.
            </li>
          )}
          {d.licenza && (
            <li>
              La licenza dell&apos;app costa {d.licenza} ogni {d.licenzaMesi} mesi, dopo il primo anno compreso nello start kit.
            </li>
          )}
          <li>
            Per le provvigioni di carriera basta essere attiva: almeno {d.sogliaAttivita} punti nel mese, con i tuoi acquisti o con
            quelli delle tue clienti. La provvigione sulle vendite del negozio la ricevi sempre.
          </li>
          <li>Nessun obbligo di orari o di quantità: decidi tu quanto tempo dedicarci.</li>
        </ul>
      </Scheda>

      <div className="rounded-xl border border-bordo bg-superficie p-4 text-xs text-testo-tenue">
        I guadagni dipendono solo dalle vendite e dall&apos;impegno di ciascuna: non esistono guadagni garantiti. È un&apos;attività
        di vendita a domicilio (Legge 173/2005), compatibile con altri lavori. Il piano completo te lo spiega la sede quando ti
        contatta.
      </div>

      <Scheda className="border-oro/60">
        <h2 className="font-titoli text-xl text-oro-chiaro">Ti interessa?</h2>
        <p className="mt-1 text-sm text-testo-tenue">Invia la tua candidatura: la sede G LUXE ti contatterà per tutte le informazioni, senza impegno.</p>
        <div className="mt-4">
          {aperta ? <Avviso tipo="ok">Hai già inviato la tua candidatura: la sede ti contatterà a breve.</Avviso> : <ModuloCandidatura />}
        </div>
      </Scheda>
    </div>
  );
}
