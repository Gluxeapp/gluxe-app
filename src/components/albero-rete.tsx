import Link from "next/link";
import type { VistaNodo } from "@/lib/carriera";
import { OrganigrammaCentrato } from "./organigramma-centrato";

/**
 * Due modi di vedere la rete (Fase 5):
 * - "grafica": organigramma Unilevel dall'alto in basso, con la radice in cima e ogni livello su una riga;
 * - "lista": tabella livello per livello.
 * Nessun JavaScript: i collegamenti ricaricano la pagina dal server, che decide cosa si può vedere.
 */

type Collegamento = (id: string) => string;

/**
 * Organigramma Unilevel. `riparti` dà il collegamento per far ripartire il grafico da una persona.
 * Sul telefono: schede compatte e solo due livelli sotto la persona in cima; chi ha altre persone sotto
 * mostra "+N" e toccandola il grafico riparte da lei. Sul computer si vede tutta la rete.
 */
export function ReteGrafica({
  radice,
  riparti,
  scheda,
}: {
  radice: VistaNodo;
  riparti?: Collegamento;
  scheda?: Collegamento;
}) {
  return (
    <OrganigrammaCentrato>
      <div className="organigramma inline-block min-w-full">
        <ul>
          <Nodo
            nodo={radice}
            riparti={riparti}
            scheda={scheda}
            profondita={0}
          />
        </ul>
      </div>
    </OrganigrammaCentrato>
  );
}

const quantiSotto = (n: VistaNodo): number =>
  n.figli.reduce((t, f) => t + 1 + quantiSotto(f), 0);

function Nodo({
  nodo,
  riparti,
  scheda,
  profondita,
}: {
  nodo: VistaNodo;
  riparti?: Collegamento;
  scheda?: Collegamento;
  profondita: number;
}) {
  const radice = profondita === 0;
  // Sul telefono i livelli oltre il secondo si nascondono: si arriva lì ripartendo da questa persona.
  const nascostiSuTelefono = profondita >= 2 && nodo.figli.length > 0;
  const contenuto = (
    <>
      <span className="block text-[11px] text-testo-tenue">{nodo.codice}</span>
      <span className="block font-semibold leading-tight">{nodo.nome}</span>
      <span className="block text-[11px] text-testo-tenue">
        {nodo.qualifica ?? "nessuna qualifica"}
      </span>
      <span className="block text-[11px]">
        {nodo.puntiPersonali} / {nodo.puntiGruppo}
      </span>
      {nascostiSuTelefono && (
        <span className="mt-0.5 inline-block rounded-full bg-oro px-1.5 text-[10px] font-semibold text-nero sm:hidden">
          +{quantiSotto(nodo)}
        </span>
      )}
    </>
  );
  const classe = `inline-block w-[6.5rem] break-words rounded-lg border px-1.5 py-1.5 text-[11px] leading-snug sm:w-32 sm:px-2 sm:text-xs ${
    radice
      ? "border-oro bg-oro/10"
      : nodo.attiva
        ? "border-oro/50 bg-superficie"
        : "border-bordo bg-superficie opacity-70"
  }`;
  return (
    <li>
      {riparti && !radice && nodo.figli.length > 0 ? (
        <Link
          href={riparti(nodo.id)}
          className={`${classe} hover:border-oro`}
          title="Mostra la rete da qui"
        >
          {contenuto}
        </Link>
      ) : (
        <div className={classe}>{contenuto}</div>
      )}
      {scheda && (
        <Link
          href={scheda(nodo.id)}
          className="mt-0.5 block text-[10px] text-oro-chiaro"
        >
          scheda
        </Link>
      )}
      {nodo.figli.length > 0 && (
        <ul className={nascostiSuTelefono ? "max-sm:hidden" : undefined}>
          {nodo.figli.map((f) => (
            <Nodo
              key={f.id}
              nodo={f}
              riparti={riparti}
              scheda={scheda}
              profondita={profondita + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Tutte le persone sotto la radice, livello per livello, con il codice della loro sponsor. */
function inLista(radice: VistaNodo) {
  const righe: (VistaNodo & { sponsor: string })[] = [];
  const coda: [VistaNodo, string][] = radice.figli.map((f) => [
    f,
    radice.codice,
  ]);
  while (coda.length) {
    const [n, sponsor] = coda.shift()!;
    righe.push({ ...n, sponsor });
    coda.push(...n.figli.map((f): [VistaNodo, string] => [f, n.codice]));
  }
  return righe.sort(
    (a, b) => a.livello - b.livello || (a.codice < b.codice ? -1 : 1),
  );
}

export function ReteLista({
  radice,
  scheda,
}: {
  radice: VistaNodo;
  scheda?: Collegamento;
}) {
  const righe = inLista(radice);
  const conContatti = righe.some((r) => r.contatti);
  const nome = (r: VistaNodo) =>
    scheda ? (
      <Link href={scheda(r.id)} className="text-oro-chiaro">
        {r.nome}
      </Link>
    ) : (
      <span className="font-semibold">{r.nome}</span>
    );
  return (
    <>
      {/* Telefono: una scheda per persona. */}
      <ul className="space-y-2 sm:hidden">
        {righe.map((r) => (
          <li
            key={r.id}
            className={`rounded-lg border border-bordo bg-superficie px-3 py-2 text-sm ${r.attiva ? "" : "text-testo-tenue"}`}
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="min-w-0">
                {nome(r)}{" "}
                <span className="text-xs text-testo-tenue">{r.codice}</span>
              </p>
              <span className="shrink-0 text-xs text-testo-tenue">
                {r.livello}° livello
              </span>
            </div>
            <p className="text-xs text-testo-tenue">
              Sponsor {r.sponsor} · {r.attiva ? "attiva" : "non attiva"}
              {r.stato !== "attivo" ? ` · ${r.stato}` : ""}
            </p>
            <p className="text-xs">
              {r.qualifica ?? "Nessuna qualifica"} ({r.percentuale})
              {r.titolo ? ` · ${r.titolo}` : ""} · punti {r.puntiPersonali} /
              gruppo {r.puntiGruppo}
            </p>
            {r.contatti && (
              <p className="mt-1 flex flex-wrap gap-x-3 text-xs">
                <a
                  href={`tel:${r.contatti.telefono}`}
                  className="text-oro-chiaro"
                >
                  {r.contatti.telefono}
                </a>
                <a
                  href={`mailto:${r.contatti.email}`}
                  className="break-all text-oro-chiaro"
                >
                  {r.contatti.email}
                </a>
              </p>
            )}
          </li>
        ))}
      </ul>
      {/* Computer e tablet: tabella. */}
      <div className="hidden overflow-x-auto rounded-xl border border-bordo sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-superficie text-testo-tenue">
            <tr>
              <th className="px-3 py-2 font-medium">Livello</th>
              <th className="px-3 py-2 font-medium">Incaricata</th>
              <th className="px-3 py-2 font-medium">Sponsor</th>
              <th className="px-3 py-2 font-medium">Qualifica</th>
              <th className="px-3 py-2 text-right font-medium">
                Punti personali
              </th>
              <th className="px-3 py-2 text-right font-medium">
                Punti di gruppo
              </th>
              {conContatti && (
                <th className="px-3 py-2 font-medium">Contatti</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-bordo">
            {righe.map((r) => (
              <tr key={r.id} className={r.attiva ? "" : "text-testo-tenue"}>
                <td className="px-3 py-2">{r.livello}°</td>
                <td className="px-3 py-2">
                  {nome(r)}{" "}
                  <span className="text-xs text-testo-tenue">{r.codice}</span>
                  <span className="block text-xs">
                    {r.attiva ? "attiva" : "non attiva"}
                    {r.stato !== "attivo" ? ` · ${r.stato}` : ""}
                  </span>
                </td>
                <td className="px-3 py-2 text-xs">{r.sponsor}</td>
                <td className="px-3 py-2">
                  {r.qualifica ?? "—"}{" "}
                  <span className="text-xs text-testo-tenue">
                    ({r.percentuale})
                  </span>
                  {r.titolo && (
                    <span className="block text-xs text-oro-chiaro">
                      {r.titolo}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">{r.puntiPersonali}</td>
                <td className="px-3 py-2 text-right">{r.puntiGruppo}</td>
                {conContatti && (
                  <td className="px-3 py-2 text-xs">
                    {r.contatti && (
                      <>
                        <a
                          href={`tel:${r.contatti.telefono}`}
                          className="block text-oro-chiaro"
                        >
                          {r.contatti.telefono}
                        </a>
                        <a
                          href={`mailto:${r.contatti.email}`}
                          className="block text-oro-chiaro"
                        >
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
    </>
  );
}

/** Scelta tra le due viste: collegamenti che mantengono mese e punto di partenza. */
export function SceltaVista({
  attiva,
  href,
}: {
  attiva: "grafica" | "lista";
  href: (vista: "grafica" | "lista") => string;
}) {
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
    <div
      className="flex flex-wrap gap-2 text-sm"
      role="group"
      aria-label="Vista della rete"
    >
      {voce("grafica", "Grafica Unilevel")}
      {voce("lista", "Lista")}
    </div>
  );
}

/** Persona dentro l'albero (per far ripartire il grafico solo da chi sta nella rete). */
export function trovaNodo(
  radice: VistaNodo,
  id: string,
): VistaNodo | undefined {
  if (radice.id === id) return radice;
  for (const f of radice.figli) {
    const trovato = trovaNodo(f, id);
    if (trovato) return trovato;
  }
  return undefined;
}
