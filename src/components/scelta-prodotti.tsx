import Image from "next/image";

/** Prodotto in vetrina, con i testi già pronti dal server (il browser non calcola prezzi). */
export type ProdottoVetrina = {
  id: string;
  nome: string;
  dettaglio: string;
  descrizione: string | null;
  immagineId: string | null;
  prezzo: string;
  barrato?: string;
  promozione?: string;
};

/** Schede dei prodotti con la quantità da scegliere (campi "q_<id>" del modulo). */
export function SceltaProdotti({ prodotti, valori = {} }: { prodotti: ProdottoVetrina[]; valori?: Record<string, string> }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {prodotti.map((p) => (
        <li key={p.id} className="flex flex-col rounded-xl border border-bordo bg-superficie p-4">
          <div className="flex gap-4">
            <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-lg bg-white p-1">
              {p.immagineId ? (
                <Image src={`/api/immagini/${p.immagineId}`} alt={p.nome} width={96} height={128} unoptimized className="max-h-full w-auto object-contain" />
              ) : (
                <span className="text-xs text-neutral-400">Foto in arrivo</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              {p.promozione && <p className="mb-1 inline-block rounded-full bg-oro px-2 py-0.5 text-[11px] font-semibold text-nero">{p.promozione}</p>}
              <h3 className="font-titoli text-xl leading-tight text-oro-chiaro">{p.nome}</h3>
              {p.dettaglio && <p className="text-xs text-testo-tenue">{p.dettaglio}</p>}
              {p.descrizione && <p className="mt-1 line-clamp-3 text-xs text-testo-tenue">{p.descrizione}</p>}
              <p className="mt-2">
                {p.barrato && <span className="mr-2 text-xs text-testo-tenue line-through">{p.barrato}</span>}
                <span className="font-semibold text-oro-chiaro">{p.prezzo}</span>
              </p>
            </div>
          </div>
          <label htmlFor={`q_${p.id}`} className="mt-3 flex items-center justify-between gap-3 border-t border-bordo pt-3 text-sm text-testo-tenue">
            Quantità
            <input
              id={`q_${p.id}`}
              name={`q_${p.id}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              placeholder="0"
              defaultValue={valori[`q_${p.id}`]}
              className="w-20 rounded-lg border border-bordo bg-nero px-3 py-2 text-center text-lg text-testo"
            />
          </label>
        </li>
      ))}
      {prodotti.length === 0 && <li className="text-testo-tenue">Nessun prodotto disponibile.</li>}
    </ul>
  );
}
