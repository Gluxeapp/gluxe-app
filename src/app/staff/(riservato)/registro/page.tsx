import Link from "next/link";
import { Suspense } from "react";
import { Caricamento, Titolo } from "@/components/ui";
import { dataOra, NOMI_AZIONI, ultimeModifiche } from "@/lib/dati-staff";

export default function Registro() {
  return (
    <>
      <Titolo sottotitolo="Le ultime 200 azioni: chi ha fatto cosa e quando. Il registro non si può modificare.">
        Registro modifiche
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Elenco />
      </Suspense>
    </>
  );
}

function mostra(valore: unknown): string {
  if (valore === null || valore === undefined) return "";
  return Object.entries(valore as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${v ?? "—"}`)
    .join(" · ");
}

async function Elenco() {
  const righe = await ultimeModifiche();
  return (
    <div className="overflow-x-auto rounded-xl border border-bordo">
      <table className="w-full text-left text-sm">
        <thead className="bg-superficie text-testo-tenue">
          <tr>
            <th className="px-4 py-3 font-medium">Quando</th>
            <th className="px-4 py-3 font-medium">Chi</th>
            <th className="px-4 py-3 font-medium">Azione</th>
            <th className="px-4 py-3 font-medium">Dettagli</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bordo">
          {righe.map((r) => (
            <tr key={String(r.id)} className="align-top">
              <td className="whitespace-nowrap px-4 py-3 text-testo-tenue">{dataOra(r.creatoIl)}</td>
              <td className="px-4 py-3">{r.autore ?? "Sistema"}</td>
              <td className="px-4 py-3">
                {r.entita === "incaricato" && r.entitaId ? (
                  <Link href={`/staff/incaricati/${r.entitaId}`} className="text-oro-chiaro">
                    {NOMI_AZIONI[r.azione] ?? r.azione}
                  </Link>
                ) : (
                  (NOMI_AZIONI[r.azione] ?? r.azione)
                )}
              </td>
              <td className="px-4 py-3 text-xs text-testo-tenue">
                {r.prima ? <p>Prima: {mostra(r.prima)}</p> : null}
                {r.dopo ? <p>Dopo: {mostra(r.dopo)}</p> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
