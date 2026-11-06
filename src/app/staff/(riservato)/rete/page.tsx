import Link from "next/link";
import { Suspense } from "react";
import { ReteGrafica, ReteLista, SceltaVista } from "@/components/albero-rete";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { mesiDisponibili, reteSede } from "@/lib/carriera";
import { contaRete } from "@/lib/rete";

export default function ReteSede({ searchParams }: PageProps<"/staff/rete">) {
  return (
    <>
      <Titolo sottotitolo="Struttura della rete con qualifica e punti del mese. In grafica Unilevel o in lista. Nel grafico tocca una persona per ripartire da lei; «scheda» apre la sua scheda.">
        Rete
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const NOMI_MESI = ["gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno", "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"];
const nomeMese = (m: string) => `${NOMI_MESI[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

async function Contenuto({ searchParams }: Pick<PageProps<"/staff/rete">, "searchParams">) {
  await richiediStaff(["amministrazione"]);
  const [{ mese: richiesto, da, vista: vistaRichiesta }, mesi] = await Promise.all([searchParams, mesiDisponibili()]);
  const vista = vistaRichiesta === "lista" ? "lista" : "grafica";
  const mese = typeof richiesto === "string" && mesi.includes(richiesto) ? richiesto : mesi[0];
  const radice = typeof da === "string" && /^[0-9a-f-]{36}$/.test(da) ? da : undefined;
  const { alberi, nodi, totale } = await reteSede(mese, radice);
  const indirizzo = (v: { vista?: string; da?: string }) => {
    const q = new URLSearchParams({ mese, vista: v.vista ?? vista });
    if (v.da) q.set("da", v.da);
    return `/staff/rete?${q}`;
  };

  return (
    <div className="grid gap-4">
      <form className="flex flex-wrap items-end gap-2 text-sm">
        {radice && <input type="hidden" name="da" value={radice} />}
        <input type="hidden" name="vista" value={vista} />
        <label className="grid gap-1">
          <span className="text-testo-tenue">Mese</span>
          <select name="mese" defaultValue={mese} className="rounded-lg border border-bordo bg-superficie px-3 py-2">
            {mesi.map((m) => (
              <option key={m} value={m}>
                {nomeMese(m)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-lg border border-oro/60 px-4 py-2 text-oro-chiaro">
          Mostra
        </button>
        {radice && (
          <Link href={indirizzo({})} className="px-2 py-2 text-testo-tenue">
            Mostra tutta la rete
          </Link>
        )}
      </form>

      <p className="text-sm text-testo-tenue">
        {radice ? `Rete di una incaricata: ${nodi[0] ? contaRete(nodi[0]).persone : 0} persone sotto di lei.` : `${totale} incaricate in tutto, ${alberi.length} capostipiti.`}
      </p>

      {alberi.length === 0 && <Scheda>Nessuna incaricata.</Scheda>}
      <SceltaVista attiva={vista} href={(v) => indirizzo({ vista: v, da: radice })} />
      {alberi.map((a) => (
        <Scheda key={a.id}>
          {vista === "lista" ? (
            <>
              <p className="mb-2 text-sm">
                Sotto <strong>{a.nome}</strong> ({a.codice})
              </p>
              <ReteLista radice={a} scheda={(id) => `/staff/incaricati/${id}`} />
            </>
          ) : (
            <ReteGrafica radice={a} riparti={(id) => indirizzo({ da: id })} scheda={(id) => `/staff/incaricati/${id}`} />
          )}
        </Scheda>
      ))}
    </div>
  );
}
