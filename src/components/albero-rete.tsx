import Link from "next/link";
import type { VistaNodo } from "@/lib/carriera";

/**
 * Due modi di vedere la rete (Fase 5):
 * - "grafica": organigramma Unilevel dall'alto in basso, con la radice in cima e ogni livello su una riga;
 * - "lista": tabella livello per livello.
 * Nessun JavaScript: i collegamenti ricaricano la pagina dal server, che decide cosa si può vedere.
 */

type Collegamento = (id: string) => string;

/** Organigramma Unilevel. `riparti` dà il collegamento per far ripartire il grafico da una persona. */
export function ReteGrafica({ radice, riparti, scheda }: { radice: VistaNodo; riparti?: Collegamento; scheda?: Collegamento }) {
  return (
    <div className="overflow-x-auto pb-2">
      <div className="organigramma inline-block min-w-full">
        <ul>
          <Nodo nodo={radice} riparti={riparti} scheda={scheda} radice />
        </ul>
      </div>
    </div>
  );
}

function Nodo({ nodo, riparti, scheda, radice }: { nodo: VistaNodo; riparti?: Collegamento; scheda?: Collegamento; radice?: boolean }) {
  const contenuto = (
    <>
      <span className="block text-[11px] text-testo-tenue">{nodo.codice}</span>
      <span className="block font-semibold leading-tight">{nodo.nome}</span>
      <span className="block text-[11px] text-testo-tenue">{nodo.qualifica ?? "nessuna qualifica"}</span>
      <span className="block text-[11px]">
        {nodo.puntiPersonali} / {nodo.puntiGruppo}
      </span>
    </>
  );
  const classe = `inline-block w-32 rounded-lg border px-2 py-1.5 text-xs ${
    radice ? "border-oro bg-oro/10" : nodo.attiva ? "border-oro/50 bg-superficie" : "border-bordo bg-superficie opacity-70"
  }`;
  return (
    <li>
      {riparti && !radice && nodo.figli.length > 0 ? (
        <Link href={riparti(nodo.id)} className={`${classe} hover:border-oro`} title="Mostra la rete da qui">
          {contenuto}
        </Link>
      ) : (
        <div className={classe}>{contenuto}</div>
      )}
      {scheda && (
        <Link href={scheda(nodo.id)} className="mt-0.5 block text-[10px] text-oro-chiaro">
          scheda
        </Link>
      )}
      {nodo.figli.length > 0 && (
        <ul>
          {nodo.figli.map((f) => (
            <Nodo key={f.id} nodo={f} riparti={riparti} scheda={scheda} />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Tutte le persone sotto la radice, livello per livello, con il codice della loro sponsor. */
function inLista(radice: VistaNodo) {
  const righe: (VistaNodo & { sponsor: string })[] = [];
  const coda: [VistaNodo, string][] = radice.figli.map((f) => [f, radice.codice]);
  while (coda.length) {
    const [n, sponsor] = coda.shift()!;
    righe.push({ ...n, sponsor });
    coda.push(...n.figli.map((f): [VistaNodo, string] => [f, n.codice]));
  }
  return righe.sort((a, b) => a.livello - b.livello || (a.codice < b.codice ? -1 : 1));
}

export function ReteLista({ radice, scheda }: { radice: VistaNodo; scheda?: Collegamento }) {
  const righe = inLista(radice);
  const conContatti = righe.some((r) => r.contatti);
  return (
    <div className="overflow-x-auto rounded-xl border border-bordo">
      <table className="w-full text-left text-sm">
        <thead className="bg-superficie text-testo-tenue">
          <tr>
            <th className="px-3 py-2 font-medium">Livello</th>
            <th className="px-3 py-2 font-medium">Incaricata</th>
            <th className="px-3 py-2 font-medium">Sponsor</th>
            <th className="px-3 py-2 font-medium">Qualifica</th>
            <th className="px-3 py-2 text-right font-medium">Punti personali</th>
            <th className="px-3 py-2 text-right font-medium">Punti di gruppo</th>
            {conContatti && <th className="px-3 py-2 font-medium">Contatti</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-bordo">
          {righe.map((r) => (
            <tr key={r.id} className={r.attiva ? "" : "text-testo-tenue"}>
              <td className="px-3 py-2">{r.livello}°</td>
              <td className="px-3 py-2">
                {scheda ? (
                  <Link href={scheda(r.id)} className="text-oro-chiaro">
                    {r.nome}
                  </Link>
                ) : (
                  <span className="font-semibold">{r.nome}</span>
                )}{" "}
                <span className="text-xs text-testo-tenue">{r.codice}</span>
                <span className="block text-xs">
                  {r.attiva ? "attiva" : "non attiva"}
                  {r.stato !== "attivo" ? ` · ${r.stato}` : ""}
                </span>
              </td>
              <td className="px-3 py-2 text-xs">{r.sponsor}</td>
              <td className="px-3 py-2">
                {r.qualifica ?? "—"} <span className="text-xs text-testo-tenue">({r.percentuale})</span>
                {r.titolo && <span className="block text-xs text-oro-chiaro">{r.titolo}</span>}
              </td>
              <td className="px-3 py-2 text-right">{r.puntiPersonali}</td>
              <td className="px-3 py-2 text-right">{r.puntiGruppo}</td>
              {conContatti && (
                <td className="px-3 py-2 text-xs">
                  {r.contatti && (
                    <>
                      <a href={`tel:${r.contatti.telefono}`} className="block text-oro-chiaro">
                        {r.contatti.telefono}
                      </a>
                      <a href={`mailto:${r.contatti.email}`} className="block text-oro-chiaro">
                        {r.contatti.email}
                      </a>
                    </>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Scelta tra le due viste: collegamenti che mantengono mese e punto di partenza. */
export function SceltaVista({ attiva, href }: { attiva: "grafica" | "lista"; href: (vista: "grafica" | "lista") => string }) {
  const voce = (v: "grafica" | "lista", etichetta: string) => (
    <Link
      href={href(v)}
      aria-current={attiva === v ? "page" : undefined}
      className={`rounded-lg border px-3 py-1.5 ${attiva === v ? "border-oro bg-oro/10 text-oro-chiaro" : "border-bordo text-testo-tenue"}`}
    >
      {etichetta}
    </Link>
  );
  return (
    <div className="flex gap-2 text-sm" role="group" aria-label="Vista della rete">
      {voce("grafica", "Grafica Unilevel")}
      {voce("lista", "Lista")}
    </div>
  );
}

/** Persona dentro l'albero (per far ripartire il grafico solo da chi sta nella rete). */
export function trovaNodo(radice: VistaNodo, id: string): VistaNodo | undefined {
  if (radice.id === id) return radice;
  for (const f of radice.figli) {
    const trovato = trovaNodo(f, id);
    if (trovato) return trovato;
  }
  return undefined;
}
