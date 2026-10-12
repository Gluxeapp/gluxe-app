import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { inviaNuovoLinkPassword } from "@/app/azioni/staff";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { dataItaliana } from "@/lib/dati-incaricato";
import { dataOra, NOMI_AZIONI, schedaIncaricato } from "@/lib/dati-staff";
import { ModuloAnagrafica, ModuloSponsor, ModuloStato } from "./moduli";

export default function SchedaIncaricato({ params }: PageProps<"/staff/incaricati/[id]">) {
  return (
    <Suspense fallback={<Caricamento />}>
      <Contenuto params={params} />
    </Suspense>
  );
}

async function Contenuto({ params }: Pick<PageProps<"/staff/incaricati/[id]">, "params">) {
  const { id } = await params;
  const s = await schedaIncaricato(id);
  if (!s) notFound();
  const i = s.incaricato;

  const valori: Record<string, string> = {
    nome: i.nome,
    cognome: i.cognome,
    codiceFiscale: i.codiceFiscale,
    dataNascita: i.dataNascita,
    indirizzo: i.indirizzo,
    cap: i.cap,
    citta: i.citta,
    provincia: i.provincia,
    telefono: i.telefono,
    email: s.email,
    iban: i.iban,
    haPartitaIva: i.partitaIva ? "si" : "no",
    partitaIva: i.partitaIva ?? "",
  };

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/staff/incaricati" className="text-testo-tenue">
          ← Incaricati
        </Link>
      </p>
      <Titolo
        sottotitolo={`${i.codice} · ${i.stato} · incaricato dal ${dataItaliana(i.creatoIl)} · ultimo accesso ${
          s.ultimoAccesso ? dataOra(s.ultimoAccesso) : "mai"
        }`}
      >
        {i.nome} {i.cognome}
      </Titolo>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <ModuloAnagrafica id={i.id} valori={valori} />
        </div>

        <div className="space-y-6">
          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Sponsor</h2>
            <p className="mt-2 text-sm">
              {s.sponsorId ? (
                <Link href={`/staff/incaricati/${s.sponsorId}`} className="text-oro-chiaro">
                  {s.sponsorNome} {s.sponsorCognome} ({s.sponsorCodice})
                </Link>
              ) : (
                "Nessuno: è il capostipite della rete"
              )}
            </p>
            <ModuloSponsor id={i.id} />
          </Scheda>

          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Stato</h2>
            <ModuloStato id={i.id} stato={i.stato} />
          </Scheda>

          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Password</h2>
            <p className="mt-2 text-sm text-testo-tenue">
              {s.haPassword ? "L'incaricato ha impostato la password." : "Password non ancora impostata."}
            </p>
            <form action={inviaNuovoLinkPassword} className="mt-3">
              <input type="hidden" name="id" value={i.id} />
              <button className="rounded-lg border border-oro/60 px-4 py-2 text-sm text-oro-chiaro">
                Invia link per la password
              </button>
            </form>
          </Scheda>

          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Diretti ({s.diretti.length})</h2>
            <ul className="mt-2 space-y-1 text-sm">
              {s.diretti.map((d) => (
                <li key={d.id}>
                  <Link href={`/staff/incaricati/${d.id}`} className="text-oro-chiaro">
                    {d.codice}
                  </Link>{" "}
                  {d.nome} {d.cognome} <span className="text-testo-tenue">· {d.stato}</span>
                </li>
              ))}
              {s.diretti.length === 0 && <li className="text-testo-tenue">Nessuno</li>}
            </ul>
          </Scheda>

          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Storico sponsor</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {s.storico.map((r, n) => (
                <li key={n}>
                  <span className="text-testo-tenue">{dataOra(r.dal)}</span> · {r.codice ?? "nessuno"} · {r.motivo}
                  {r.autore && <span className="text-testo-tenue"> ({r.autore})</span>}
                </li>
              ))}
            </ul>
          </Scheda>

          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Modifiche</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {s.modifiche.map((m, n) => (
                <li key={n}>
                  <span className="text-testo-tenue">{dataOra(m.creatoIl)}</span> · {NOMI_AZIONI[m.azione] ?? m.azione}
                  {m.autore && <span className="text-testo-tenue"> · {m.autore}</span>}
                </li>
              ))}
            </ul>
          </Scheda>
        </div>
      </div>
    </>
  );
}
