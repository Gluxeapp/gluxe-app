import Link from "next/link";
import { Suspense } from "react";
import { Caricamento, Titolo } from "@/components/ui";
import { dataItaliana } from "@/lib/dati-incaricato";
import { elencoIncaricati, PER_PAGINA } from "@/lib/dati-staff";

export default function Incaricati({ searchParams }: PageProps<"/staff/incaricati">) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Titolo>Incaricati</Titolo>
        <Link href="/staff/incaricati/nuovo" className="rounded-lg bg-oro px-4 py-2 font-semibold text-nero">
          Nuovo incaricato
        </Link>
      </div>
      <Suspense fallback={<Caricamento />}>
        <Elenco searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const COLORE_STATO: Record<string, string> = {
  attivo: "text-oro-chiaro",
  sospeso: "text-errore",
  cessato: "text-testo-tenue",
  cliente: "text-testo-tenue",
};

async function Elenco({ searchParams }: Pick<PageProps<"/staff/incaricati">, "searchParams">) {
  const parametri = await searchParams;
  const ricerca = typeof parametri.q === "string" ? parametri.q : "";
  const pagina = Math.max(1, Number(parametri.pagina) || 1);
  const { righe, totale } = await elencoIncaricati(ricerca, pagina);
  const pagine = Math.max(1, Math.ceil(totale / PER_PAGINA));

  return (
    <>
      <form className="mb-5 flex gap-3" role="search">
        <input
          name="q"
          defaultValue={ricerca}
          placeholder="Cerca per nome, cognome, codice GL o codice fiscale"
          aria-label="Cerca incaricati"
          className="flex-1 rounded-lg border border-bordo bg-superficie px-4 py-2 text-testo focus:border-oro focus:outline-none"
        />
        <button className="rounded-lg border border-oro/60 px-4 text-oro-chiaro">Cerca</button>
      </form>

      <p className="mb-3 text-sm text-testo-tenue">{totale} incaricati trovati</p>
      <div className="overflow-x-auto rounded-xl border border-bordo">
        <table className="w-full text-left text-sm">
          <thead className="bg-superficie text-testo-tenue">
            <tr>
              <th className="px-4 py-3 font-medium">Codice</th>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Città</th>
              <th className="px-4 py-3 font-medium">Sponsor</th>
              <th className="px-4 py-3 font-medium">Stato</th>
              <th className="px-4 py-3 font-medium">Dal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bordo">
            {righe.map((r) => (
              <tr key={r.id} className="hover:bg-superficie">
                <td className="px-4 py-3">
                  <Link href={`/staff/incaricati/${r.id}`} className="font-semibold text-oro-chiaro">
                    {r.codice}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {r.nome} {r.cognome}
                </td>
                <td className="px-4 py-3 text-testo-tenue">{r.citta}</td>
                <td className="px-4 py-3 text-testo-tenue">{r.sponsorCodice ?? "Capostipite"}</td>
                <td className={`px-4 py-3 ${COLORE_STATO[r.stato]}`}>{r.stato}</td>
                <td className="px-4 py-3 text-testo-tenue">{dataItaliana(r.creatoIl)}</td>
              </tr>
            ))}
            {righe.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-testo-tenue">
                  Nessun incaricato trovato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagine > 1 && (
        <nav aria-label="Pagine" className="mt-4 flex justify-center gap-4 text-sm">
          {pagina > 1 && (
            <Link href={{ query: { q: ricerca, pagina: pagina - 1 } }} className="text-oro-chiaro">
              ← Precedenti
            </Link>
          )}
          <span className="text-testo-tenue">
            Pagina {pagina} di {pagine}
          </span>
          {pagina < pagine && (
            <Link href={{ query: { q: ricerca, pagina: pagina + 1 } }} className="text-oro-chiaro">
              Successivi →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
