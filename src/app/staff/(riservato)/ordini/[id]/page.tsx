import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EtichettaStato } from "@/components/etichetta-stato";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { db } from "@/db";
import { rimborsi } from "@/db/schema";
import { richiediStaff } from "@/lib/accesso";
import { formattaEuro, formatta } from "@/lib/denaro";
import { dataOra, ETICHETTE_STATO, incaricataDellOrdine, leggiOrdine, numeroOrdine } from "@/lib/ordini";
import { ModuloStato } from "./modulo-stato";

export default function OrdineStaff({ params }: PageProps<"/staff/ordini/[id]">) {
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/staff/ordini" className="text-testo-tenue">
          ← Ordini
        </Link>
      </p>
      <Suspense fallback={<Caricamento />}>
        <Contenuto params={params} />
      </Suspense>
    </>
  );
}

async function Contenuto({ params }: Pick<PageProps<"/staff/ordini/[id]">, "params">) {
  const staff = await richiediStaff(["amministrazione", "ordini"]);
  const { id } = await params;
  const letto = await leggiOrdine(id);
  if (!letto) notFound();
  const { ordine, righe, storico } = letto;
  const [incaricata, elencoRimborsi] = await Promise.all([
    incaricataDellOrdine(ordine.incaricatoId),
    db().select().from(rimborsi).where(eq(rimborsi.ordineId, ordine.id)).orderBy(asc(rimborsi.rimborsatoIl)),
  ]);

  return (
    <>
      <Titolo
        sottotitolo={
          <>
            {ordine.tipo === "start_kit" ? "Start kit" : "Acquisto personale"} · creato il {dataOra(ordine.creatoIl)}
            {ordine.pagatoIl && ` · pagato il ${dataOra(ordine.pagatoIl)}`}
          </>
        }
      >
        Ordine {numeroOrdine(ordine.numero)}
      </Titolo>
      <EtichettaStato stato={ordine.stato} etichetta={ETICHETTE_STATO[ordine.stato]} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Prodotti</h2>
            <table className="mt-3 w-full text-sm">
              <tbody className="divide-y divide-bordo">
                {righe.map((r) => (
                  <tr key={r.id.toString()}>
                    <td className="py-2 pr-3 font-semibold">{r.quantita} ×</td>
                    <td className="py-2">
                      {r.nome} <span className="text-testo-tenue">{r.codice}</span>
                      <span className="block text-xs text-testo-tenue">
                        {formattaEuro(r.prezzoUnitarioIvato)} cad. · {formatta(r.totalePunti)} punti
                        {r.tipoPrezzo === "promozione" && " · in promozione"}
                      </span>
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">{formattaEuro(r.totaleIvato)}</td>
                  </tr>
                ))}
                <tr>
                  <td />
                  <td className="py-2 text-testo-tenue">Spedizione</td>
                  <td className="py-2 text-right">{formattaEuro(ordine.speseSpedizione)}</td>
                </tr>
                <tr className="font-semibold">
                  <td />
                  <td className="py-2">Totale</td>
                  <td className="py-2 text-right text-oro-chiaro">{formattaEuro(ordine.totale)}</td>
                </tr>
              </tbody>
            </table>
          </Scheda>

          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Spedire a</h2>
            <p className="mt-2 text-sm select-all">
              {ordine.destinatario}
              <br />
              {ordine.indirizzo}
              <br />
              {ordine.cap} {ordine.citta} ({ordine.provincia})
              <br />
              Tel. {ordine.telefono}
            </p>
            {ordine.tracciamento && (
              <p className="mt-3 text-sm">
                {ordine.corriere} · <span className="select-all">{ordine.tracciamento}</span>
              </p>
            )}
          </Scheda>
        </div>

        <div className="space-y-6">
          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Stato</h2>
            <ModuloStato id={ordine.id} stato={ordine.stato} />
          </Scheda>

          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Incaricata</h2>
            <p className="mt-2 text-sm">
              {staff.ruolo === "amministrazione" ? (
                <Link href={`/staff/incaricati/${incaricata.id}`} className="text-oro-chiaro">
                  {incaricata.nome} {incaricata.cognome}
                </Link>
              ) : (
                `${incaricata.nome} ${incaricata.cognome}`
              )}{" "}
              <span className="text-testo-tenue">{incaricata.codice}</span>
              <br />
              {incaricata.email}
            </p>
          </Scheda>

          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Storico</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {storico.map((s, i) => (
                <li key={i}>
                  <span className="font-semibold">{ETICHETTE_STATO[s.stato]}</span>{" "}
                  <span className="text-testo-tenue">
                    {dataOra(s.creatoIl)} · {s.da ?? (s.stato === "pagato" ? "Stripe" : "sistema")}
                  </span>
                  {s.nota && <span className="block text-xs text-testo-tenue">{s.nota}</span>}
                </li>
              ))}
            </ul>
            {ordine.riordinoConfermatoIl && (
              <p className="mt-3 text-xs text-testo-tenue">Riordino 70% confermato il {dataOra(ordine.riordinoConfermatoIl)}</p>
            )}
          </Scheda>

          {(ordine.stripePagamentoId || elencoRimborsi.length > 0) && (
            <Scheda>
              <h2 className="font-titoli text-xl text-oro-chiaro">Pagamento</h2>
              {ordine.stripePagamentoId && (
                <p className="mt-2 text-xs text-testo-tenue">
                  Codice Stripe: <span className="select-all">{ordine.stripePagamentoId}</span>
                </p>
              )}
              {elencoRimborsi.map((r) => (
                <p key={r.id} className="mt-2 text-sm">
                  Rimborso {formattaEuro(r.importo)} il {dataOra(r.rimborsatoIl)}
                </p>
              ))}
            </Scheda>
          )}
        </div>
      </div>
    </>
  );
}
