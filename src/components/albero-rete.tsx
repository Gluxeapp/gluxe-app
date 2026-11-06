import Link from "next/link";
import type { VistaNodo } from "@/lib/carriera";

/**
 * Albero grafico della rete: ogni persona è una scheda, le sue dirette stanno sotto, collegate da una
 * linea. Si apre e si chiude toccando la scheda (funziona anche senza JavaScript). Aperti i primi due livelli.
 */
export function AlberoRete({ radice, collegamento, mostraRadice = true }: { radice: VistaNodo; collegamento?: (id: string) => string; mostraRadice?: boolean }) {
  return (
    <ul className="space-y-2" aria-label="Rete">
      {mostraRadice ? (
        <Ramo nodo={radice} collegamento={collegamento} />
      ) : (
        radice.figli.map((f) => <Ramo key={f.id} nodo={f} collegamento={collegamento} />)
      )}
    </ul>
  );
}

function Scheda({ nodo, collegamento }: { nodo: VistaNodo; collegamento?: (id: string) => string }) {
  const nome = collegamento ? (
    <Link href={collegamento(nodo.id)} className="text-oro-chiaro">
      {nodo.nome}
    </Link>
  ) : (
    nodo.nome
  );
  return (
    <div className="min-w-0 flex-1">
      <p className="truncate">
        <span className="font-semibold">{nome}</span> <span className="text-xs text-testo-tenue">{nodo.codice}</span>
      </p>
      <p className="text-xs text-testo-tenue">
        <span className={nodo.attiva ? "text-oro-chiaro" : ""}>{nodo.attiva ? "attiva" : "non attiva"}</span>
        {nodo.stato !== "attivo" ? ` · ${nodo.stato}` : ""} · {nodo.qualifica ?? "nessuna qualifica"} ({nodo.percentuale})
        {nodo.titolo ? ` · ${nodo.titolo}` : ""}
      </p>
      <p className="text-xs text-testo-tenue">
        Punti personali {nodo.puntiPersonali} · di gruppo {nodo.puntiGruppo}
      </p>
      {nodo.contatti && (
        <p className="text-xs">
          <a href={`tel:${nodo.contatti.telefono}`} className="text-oro-chiaro">
            {nodo.contatti.telefono}
          </a>{" "}
          ·{" "}
          <a href={`mailto:${nodo.contatti.email}`} className="text-oro-chiaro">
            {nodo.contatti.email}
          </a>
        </p>
      )}
    </div>
  );
}

function Ramo({ nodo, collegamento }: { nodo: VistaNodo; collegamento?: (id: string) => string }) {
  const riquadro = "flex items-start gap-3 rounded-lg border border-bordo bg-superficie px-3 py-2 text-sm";
  if (nodo.figli.length === 0) {
    return (
      <li>
        <div className={riquadro}>
          <span aria-hidden className="mt-1 h-2 w-2 shrink-0 rounded-full bg-bordo" />
          <Scheda nodo={nodo} collegamento={collegamento} />
        </div>
      </li>
    );
  }
  return (
    <li>
      <details open={nodo.livello < 2} className="group">
        <summary className={`${riquadro} cursor-pointer list-none`}>
          <span aria-hidden className="mt-0.5 shrink-0 text-oro transition-transform group-open:rotate-90">
            ▸
          </span>
          <Scheda nodo={nodo} collegamento={collegamento} />
          <span className="shrink-0 text-xs text-testo-tenue">{nodo.figli.length}</span>
        </summary>
        <ul className="ml-3 mt-2 space-y-2 border-l border-oro/30 pl-3">
          {nodo.figli.map((f) => (
            <Ramo key={f.id} nodo={f} collegamento={collegamento} />
          ))}
        </ul>
      </details>
    </li>
  );
}
