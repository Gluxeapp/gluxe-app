import { Suspense } from "react";
import { segnaRichiestaGestita } from "@/app/azioni/staff";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { dataOra, elencoRichieste } from "@/lib/dati-staff";

export default function Richieste() {
  return (
    <>
      <Titolo sottotitolo="Persone che vogliono diventare incaricate e non hanno un codice sponsor. Contattale e comunica loro un codice sponsor.">
        Richieste sponsor
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
      {richieste.map(({ richiesta: r, gestore }) => (
        <Scheda key={r.id} className={r.stato === "gestita" ? "opacity-60" : ""}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-semibold">
                {r.nome} {r.cognome} <span className="font-normal text-testo-tenue">· {r.citta}</span>
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
            </div>
            <p className="text-xs text-testo-tenue">{dataOra(r.creatoIl)}</p>
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
