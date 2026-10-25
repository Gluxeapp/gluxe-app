import Image from "next/image";
import { formattaEuro, formatta } from "@/lib/denaro";

type Prezzi = {
  pubblico: { ivaInclusa: bigint; punti: bigint };
  incaricata: { ivaInclusa: bigint; punti: bigint };
  margine: bigint;
  provvigioneOnline: bigint;
};

type Props = {
  nome: string;
  linea: string | null;
  formato: string | null;
  descrizione: string | null;
  immagineId: string | null;
  prezzi: Prezzi;
  /** Prezzo al pubblico senza promozione, da mostrare barrato. */
  listinoBarrato?: bigint;
  etichetta?: string;
};

/** Scheda di un prodotto per le incaricate: tutti i numeri arrivano già calcolati dal server. */
export function SchedaProdotto({ nome, linea, formato, descrizione, immagineId, prezzi, listinoBarrato, etichetta }: Props) {
  return (
    <article className="flex gap-4 rounded-xl border border-bordo bg-superficie p-4">
      <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-lg bg-white p-1">
        {immagineId ? (
          <Image
            src={`/api/immagini/${immagineId}`}
            alt={nome}
            width={96}
            height={128}
            unoptimized
            className="max-h-full w-auto object-contain"
          />
        ) : (
          <span className="text-xs text-neutral-400">Foto in arrivo</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {etichetta && (
          <p className="mb-1 inline-block rounded-full bg-oro px-2 py-0.5 text-[11px] font-semibold text-nero">{etichetta}</p>
        )}
        <h2 className="font-titoli text-xl leading-tight text-oro-chiaro">{nome}</h2>
        <p className="text-xs text-testo-tenue">{[linea, formato].filter(Boolean).join(" · ")}</p>
        {descrizione && <p className="mt-1 line-clamp-2 text-xs text-testo-tenue">{descrizione}</p>}

        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <dt className="text-testo-tenue">Al pubblico</dt>
          <dd className="text-right">
            {listinoBarrato && <span className="mr-1 text-xs text-testo-tenue line-through">{formattaEuro(listinoBarrato)}</span>}
            {formattaEuro(prezzi.pubblico.ivaInclusa)}
          </dd>
          <dt className="text-testo-tenue">Il tuo prezzo</dt>
          <dd className="text-right font-semibold text-oro-chiaro">{formattaEuro(prezzi.incaricata.ivaInclusa)}</dd>
          <dt className="text-testo-tenue">Punti (tuo acquisto)</dt>
          <dd className="text-right">{formatta(prezzi.incaricata.punti)}</dd>
          <dt className="text-testo-tenue">Dal tuo negozio</dt>
          <dd className="text-right">
            +{formattaEuro(prezzi.provvigioneOnline)} · {formatta(prezzi.pubblico.punti)} pt
          </dd>
        </dl>
      </div>
    </article>
  );
}
