import { Suspense } from "react";
import { segnaRichiestaGestita } from "@/app/azioni/staff";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { dataOra, elencoRichieste } from "@/lib/dati-staff";

export default function Richieste() {
  return (
    <>
      <Titolo sottotitolo="Persone che vogliono diventare incaricate senza un codice sponsor, clienti registrati che chiedono una consulente e clienti che si candidano come incaricate da &quot;Guadagna con G LUXE&quot;. Contattale e comunica il codice (o assegna il cliente dalla sua scheda).">
        Richieste di contatto
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Elenco />
      </Suspense>
    </>
  );
}

async function Elenco() {
  const richieste = await elencoRichieste();
  if (richieste.length === 0) return <p className="text-testo-tenue">Nessuna richiesta.</p>;
  return (
    <div className="space-y-4">
      {richieste.map(({ richiesta: r, gestore, consulente }) => (
        <Scheda key={r.id} className={r.stato === "gestita" ? "opacity-60" : ""}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">
                {r.nome} {r.cognome} <span className="font-normal text-testo-tenue">· {r.citta}</span>{" "}
                <span className="rounded-full border border-oro/50 px-2 py-0.5 text-[11px] font-normal text-oro-chiaro">
                  {r.tipo === "cliente"
                    ? "cliente: chiede una consulente"
                    : r.tipo === "candidatura"
                      ? "cliente: si candida come incaricata"
                      : "vuole diventare incaricata"}
                </span>
              </p>
              <p className="mt-1 text-sm">
                <a href={`tel:${r.telefono.replace(/\s/g, "")}`} className="text-oro-chiaro">
                  {r.telefono}
                </a>{" "}
                ·{" "}
                <a href={`mailto:${r.email}`} className="text-oro-chiaro">
                  {r.email}
                </a>
              </p>
              {r.tipo === "candidatura" && (
                <p className="mt-1 text-xs text-testo-tenue">
                  Da &quot;Guadagna con G LUXE&quot;, con il consenso a essere contattata.
                  {consulente ? ` Sua consulente: ${consulente}.` : " Senza consulente."}
                </p>
              )}
              {r.messaggio && <p className="mt-2 whitespace-pre-line rounded-lg border border-bordo bg-nero p-3 text-sm">{r.messaggio}</p>}
            </div>
            <p className="text-xs text-testo-tenue">
              {dataOra(r.creatoIl)}
              {r.clienteId && (
                <a href={`/staff/clienti/${r.clienteId}`} className="mt-1 block text-oro-chiaro underline">
                  Scheda del cliente (assegna)
                </a>
              )}
            </p>
          </div>
          {r.stato === "gestita" ? (
            <p className="mt-3 text-sm text-testo-tenue">
              Gestita {r.gestitaIl ? dataOra(r.gestitaIl) : ""} {gestore ? `da ${gestore}` : ""}
              {r.note ? ` · ${r.note}` : ""}
            </p>
          ) : (
            <form action={segnaRichiestaGestita} className="mt-4 flex flex-wrap gap-3">
              <input type="hidden" name="id" value={r.id} />
              <input
                name="note"
                placeholder="Note (es. codice sponsor comunicato)"
                aria-label="Note"
                className="min-w-0 flex-1 rounded-lg border border-bordo bg-nero px-3 py-2 text-sm"
              />
              <button className="rounded-lg bg-oro px-4 py-2 text-sm font-semibold text-nero">Segna come gestita</button>
            </form>
          )}
        </Scheda>
      ))}
    </div>
  );
}
