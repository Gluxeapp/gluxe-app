import { eq } from "drizzle-orm";
import Link from "next/link";
import { mostraContattiAiClienti } from "@/app/azioni/negozio";
import { db } from "@/db";
import { incaricati } from "@/db/schema";
import { Suspense } from "react";
import { EtichettaStato } from "@/components/etichetta-stato";
import { Avviso, Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediIncaricataOperativa } from "@/lib/accesso";
import { formatta, formattaEuro } from "@/lib/denaro";
import { dataItaliana } from "@/lib/dati-incaricato";
import { indirizzoApp } from "@/lib/indirizzo-app";
import { licenzaScaduta } from "@/lib/licenze";
import { clientiDellIncaricata, ordiniDelNegozio, statoNegozio } from "@/lib/negozio";
import { dataOra, ETICHETTE_STATO, numeroOrdine } from "@/lib/ordini";
import { CondividiLink } from "./condividi";

export default function PaginaNegozio() {
  return (
    <>
      <Titolo sottotitolo="Il tuo negozio online: condividi il link, i clienti comprano a prezzo pieno e tu ricevi punti e provvigione.">
        Negozio
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

async function Contenuto() {
  const { incaricato } = await richiediIncaricataOperativa();
  const stato = statoNegozio({ ...incaricato, licenzaScaduta: await licenzaScaduta(incaricato.id) });
  const link = `${indirizzoApp()}/negozio/${incaricato.codice}`;
  const [clienti, ordini, [preferenze]] = await Promise.all([
    clientiDellIncaricata(incaricato.id),
    ordiniDelNegozio(incaricato.id),
    db().select({ mostra: incaricati.mostraContattiClienti }).from(incaricati).where(eq(incaricati.id, incaricato.id)),
  ]);
  const mostra = preferenze?.mostra ?? false;

  return (
    <div className="grid gap-4">
      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">Il tuo link</h2>
        {stato.aperto ? (
          <CondividiLink link={link} />
        ) : (
          <Avviso>Il tuo negozio è chiuso ({stato.motivo}). Per informazioni contatta l&apos;azienda.</Avviso>
        )}
        <p className="mt-3 text-xs text-testo-tenue">
          Chi compra dal tuo link resta tua cliente per sempre, anche se in futuro usa il link di un&apos;altra incaricata.
          Provvigione online: 50% dei punti di ogni ordine, anche nei mesi in cui non sei attiva. Dal tuo link i clienti
          possono anche creare un profilo e ricomprare da soli.
        </p>
        {stato.aperto && (
          <Link href="/area/negozio/nuovo-ordine" className="mt-4 block rounded-lg bg-oro py-3 text-center font-semibold text-nero">
            Prepara un ordine per un cliente
          </Link>
        )}
      </Scheda>

      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">I tuoi contatti nel profilo dei clienti</h2>
        <p className="mt-1 text-sm text-testo-tenue">
          {mostra
            ? "I tuoi clienti con un profilo vedono il tuo telefono e la tua email."
            : "I tuoi clienti con un profilo vedono solo il tuo nome."}
        </p>
        <form action={mostraContattiAiClienti} className="mt-3">
          <input type="hidden" name="mostra" value={mostra ? "no" : "si"} />
          <button type="submit" className="rounded-lg border border-oro/60 px-4 py-2 text-sm text-oro-chiaro">
            {mostra ? "Nascondi i miei contatti" : "Mostra telefono ed email ai miei clienti"}
          </button>
        </form>
      </Scheda>

      <Scheda>
        <h2 className="mb-2 font-titoli text-xl text-oro-chiaro">Ordini dei tuoi clienti</h2>
        {ordini.length === 0 ? (
          <p className="text-sm text-testo-tenue">Ancora nessun ordine dal tuo negozio.</p>
        ) : (
          <ul className="divide-y divide-bordo text-sm">
            {ordini.map((o) => (
              <li key={o.id}>
                <Link href={`/area/negozio/ordine/${o.id}`} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block font-semibold">
                      {numeroOrdine(o.numero)} · {o.cliente}
                    </span>
                    <span className="block text-xs text-testo-tenue">
                      {dataOra(o.creatoIl)} · {formatta(o.punti)} punti · provvigione {formattaEuro(o.provvigione)}
                    </span>
                    <EtichettaStato stato={o.stato} etichetta={ETICHETTE_STATO[o.stato]} />
                  </span>
                  <span className="whitespace-nowrap">{formattaEuro(o.totale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Scheda>

      <Scheda>
        <h2 className="mb-2 font-titoli text-xl text-oro-chiaro">I tuoi clienti</h2>
        {clienti.length === 0 ? (
          <p className="text-sm text-testo-tenue">I clienti compaiono qui dopo il loro primo ordine.</p>
        ) : (
          <ul className="divide-y divide-bordo text-sm">
            {clienti.map((c) => (
              <li key={c.id} className="py-3">
                <p className="font-semibold">
                  {c.nome} {c.cognome}
                </p>
                <p className="text-xs text-testo-tenue">
                  {c.ordini} {c.ordini === 1 ? "ordine pagato" : "ordini pagati"}
                  {c.ultimo && ` · ultimo il ${dataItaliana(c.ultimo)}`}
                </p>
                {c.contatti ? (
                  <p className="mt-1 text-xs">
                    <a href={`mailto:${c.contatti.email}`} className="text-oro-chiaro underline">
                      {c.contatti.email}
                    </a>{" "}
                    ·{" "}
                    <a href={`tel:${c.contatti.telefono.replace(/\s/g, "")}`} className="text-oro-chiaro underline">
                      {c.contatti.telefono}
                    </a>
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-testo-tenue">Contatti non condivisi dal cliente.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Scheda>
    </div>
  );
}
