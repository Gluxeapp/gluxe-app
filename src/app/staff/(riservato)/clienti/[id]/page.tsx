import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EtichettaStato } from "@/components/etichetta-stato";
import { Avviso, Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { schedaCliente } from "@/lib/clienti";
import { ETICHETTE_MOTIVO } from "@/lib/clienti-fittizi";
import { formatta, formattaEuro } from "@/lib/denaro";
import { dataOra, ETICHETTE_STATO, numeroOrdine } from "@/lib/ordini";
import { ModuloSposta } from "./modulo-sposta";

export default function SchedaCliente({ params }: PageProps<"/staff/clienti/[id]">) {
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/staff/clienti" className="text-testo-tenue">
          ← Clienti
        </Link>
      </p>
      <Suspense fallback={<Caricamento />}>
        <Contenuto params={params} />
      </Suspense>
    </>
  );
}

async function Contenuto({ params }: Pick<PageProps<"/staff/clienti/[id]">, "params">) {
  const staff = await richiediStaff(["amministrazione", "contabilita"]);
  const { id } = await params;
  const scheda = await schedaCliente(id);
  if (!scheda) notFound();
  const { cliente: c } = scheda;

  return (
    <>
      <Titolo sottotitolo={`Cliente dal ${dataOra(c.creatoIl)}`}>
        {c.nome} {c.cognome}
      </Titolo>

      {scheda.motivi.length > 0 && (
        <div className="mb-6">
          <Avviso tipo="errore">
            Possibile cliente fittizio: {scheda.motivi.map((m) => ETICHETTE_MOTIVO[m]).join(", ")} dell&apos;incaricata a cui è legato.
          </Avviso>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Ordini</h2>
            <ul className="mt-2 divide-y divide-bordo text-sm">
              {scheda.ordini.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    {staff.ruolo === "amministrazione" ? (
                      <Link href={`/staff/ordini/${o.id}`} className="text-oro-chiaro">
                        {numeroOrdine(o.numero)}
                      </Link>
                    ) : (
                      numeroOrdine(o.numero)
                    )}{" "}
                    <span className="text-xs text-testo-tenue">
                      {dataOra(o.creatoIl)} · {formatta(o.punti)} punti a {o.codice}
                    </span>
                    <br />
                    <EtichettaStato stato={o.stato} etichetta={ETICHETTE_STATO[o.stato]} />
                  </span>
                  <span className="whitespace-nowrap">{formattaEuro(o.totale)}</span>
                </li>
              ))}
              {scheda.ordini.length === 0 && <li className="py-2 text-testo-tenue">Nessun ordine.</li>}
            </ul>
          </Scheda>

          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Storico del legame</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {scheda.legami.map((l, i) => (
                <li key={i}>
                  <span className="font-semibold">{l.codice}</span>{" "}
                  <span className="text-testo-tenue">
                    dal {dataOra(l.dal)} · {l.da ?? "sistema"}
                  </span>
                  <span className="block text-xs text-testo-tenue">{l.motivo}</span>
                </li>
              ))}
            </ul>
          </Scheda>
        </div>

        <div className="space-y-6">
          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Dati</h2>
            <p className="mt-2 text-sm">
              {c.email}
              <br />
              Tel. {c.telefono}
            </p>
            <p className="mt-3 text-xs text-testo-tenue">
              {c.consensoContattiIl
                ? `Contatti condivisi con l'incaricata dal ${dataOra(c.consensoContattiIl)}.`
                : "Contatti non condivisi con l'incaricata."}{" "}
              Privacy accettata il {dataOra(c.privacyAccettataIl)}.
            </p>
          </Scheda>

          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Incaricata</h2>
            <p className="mt-2 text-sm">
              {scheda.incaricata} <span className="text-testo-tenue">{scheda.codice}</span>
            </p>
            {staff.ruolo === "amministrazione" ? (
              <ModuloSposta id={c.id} />
            ) : (
              <p className="mt-2 text-xs text-testo-tenue">Solo l&apos;amministrazione può spostare il cliente.</p>
            )}
          </Scheda>
        </div>
      </div>
    </>
  );
}
