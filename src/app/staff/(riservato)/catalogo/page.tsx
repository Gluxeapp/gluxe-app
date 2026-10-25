import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Caricamento, Titolo } from "@/components/ui";
import { catalogoStaff } from "@/lib/catalogo";
import { formatta, formattaEuro } from "@/lib/denaro";

export default function Catalogo() {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Titolo sottotitolo="Prezzo incaricata, punti e provvigione sono calcolati dall'app con i parametri del piano.">
          Catalogo
        </Titolo>
        <Link href="/staff/catalogo/nuovo" className="rounded-lg bg-oro px-4 py-2 font-semibold text-nero">
          Nuovo prodotto
        </Link>
      </div>
      <Suspense fallback={<Caricamento />}>
        <Elenco />
      </Suspense>
    </>
  );
}

async function Elenco() {
  const catalogo = await catalogoStaff();
  return (
    <div className="overflow-x-auto rounded-xl border border-bordo">
      <table className="w-full text-left text-sm">
        <thead className="bg-superficie text-testo-tenue">
          <tr>
            <th className="px-3 py-3 font-medium">Foto</th>
            <th className="px-3 py-3 font-medium">Prodotto</th>
            <th className="px-3 py-3 text-right font-medium">Al pubblico</th>
            <th className="px-3 py-3 text-right font-medium">Incaricata</th>
            <th className="px-3 py-3 text-right font-medium">Punti (pubblico / incaricata)</th>
            <th className="px-3 py-3 text-right font-medium">Provvigione negozio</th>
            <th className="px-3 py-3 font-medium">Stato</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bordo">
          {catalogo.map(({ prodotto: p, prezzi, kit, promozione }) => (
            <tr key={p.id} className={p.attivo ? "" : "opacity-50"}>
              <td className="px-3 py-2">
                <div className="flex h-14 w-12 items-center justify-center rounded bg-white">
                  {p.immagineId && (
                    <Image src={`/api/immagini/${p.immagineId}`} alt="" width={48} height={56} unoptimized className="max-h-14 w-auto" />
                  )}
                </div>
              </td>
              <td className="px-3 py-2">
                <Link href={`/staff/catalogo/${p.id}`} className="font-semibold text-oro-chiaro">
                  {p.nome}
                </Link>
                <p className="text-xs text-testo-tenue">
                  {p.codice}
                  {p.linea ? ` · ${p.linea}` : ""}
                  {promozione ? ` · in promozione a ${formattaEuro(promozione.prezzoPromo)}` : ""}
                </p>
              </td>
              <td className="px-3 py-2 text-right">{formattaEuro(p.prezzoListino)}</td>
              {prezzi ? (
                <>
                  <td className="px-3 py-2 text-right">{formattaEuro(prezzi.incaricata.ivaInclusa)}</td>
                  <td className="px-3 py-2 text-right">
                    {formatta(prezzi.pubblico.punti)} / {formatta(prezzi.incaricata.punti)}
                  </td>
                  <td className="px-3 py-2 text-right">{formattaEuro(prezzi.provvigioneOnline)}</td>
                </>
              ) : (
                <td colSpan={3} className="px-3 py-2 text-right text-testo-tenue">
                  Start kit: {kit ? formatta(kit.punti) : ""} punti fissi
                </td>
              )}
              <td className="px-3 py-2">{p.attivo ? "Attivo" : "Disattivato"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
