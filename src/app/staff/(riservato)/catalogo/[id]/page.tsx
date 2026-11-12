import { eq } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { cambiaAttivoProdotto } from "@/app/azioni/catalogo";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { db } from "@/db";
import { prodotti } from "@/db/schema";
import { richiediStaff } from "@/lib/accesso";
import { parametriCorrenti } from "@/lib/catalogo";
import { formatta, formattaEuro } from "@/lib/denaro";
import { prezziProdotto } from "@/lib/prezzi";
import { ModuloProdotto } from "../modulo-prodotto";
import { ModuloPunti } from "../modulo-punti";

export default function SchedaProdottoStaff({ params }: PageProps<"/staff/catalogo/[id]">) {
  return (
    <Suspense fallback={<Caricamento />}>
      <Contenuto params={params} />
    </Suspense>
  );
}

async function Contenuto({ params }: Pick<PageProps<"/staff/catalogo/[id]">, "params">) {
  // Tutto lo staff vede la scheda e può cambiare i punti; prezzi e dati del prodotto solo l'amministrazione.
  const { ruolo } = await richiediStaff();
  const amministrazione = ruolo === "amministrazione";
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [[p], parametri] = await Promise.all([db().select().from(prodotti).where(eq(prodotti.id, id)).limit(1), parametriCorrenti()]);
  if (!p) notFound();
  const automatici = p.tipo === "prodotto" ? prezziProdotto(p.prezzoListino, parametri) : undefined;

  const valori = {
    codice: p.codice,
    nome: p.nome,
    linea: p.linea ?? "",
    formato: p.formato ?? "",
    descrizione: p.descrizione ?? "",
    prezzoListino: formatta(p.prezzoListino),
    ordine: String(p.ordine),
  };

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/staff/catalogo" className="text-testo-tenue">
          ← Catalogo
        </Link>
      </p>
      <Titolo sottotitolo={`${p.codice} · ${p.attivo ? "attivo" : "disattivato"}${p.tipo === "start_kit" ? " · start kit" : p.tipo === "licenza" ? " · rinnovo annuale della licenza" : ""}`}>
        {p.nome}
      </Titolo>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        {amministrazione ? (
          <ModuloProdotto id={p.id} valori={valori} startKit={p.tipo === "start_kit"} licenza={p.tipo === "licenza"} />
        ) : (
          <Scheda>
            <p className="text-sm text-testo-tenue">Prezzo al pubblico</p>
            <p className="font-titoli text-2xl text-oro-chiaro">{formattaEuro(p.prezzoListino)}</p>
            <p className="mt-3 text-sm text-testo-tenue">Prezzi e dati del prodotto li modifica l&apos;amministrazione. Tu puoi cambiare i punti qui a fianco.</p>
          </Scheda>
        )}
        <div className="space-y-6">
          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Punti</h2>
            {automatici ? (
              <ModuloPunti
                id={p.id}
                valori={{
                  puntiPersonaleManuali: p.puntiPersonaleManuali === null ? "" : formatta(p.puntiPersonaleManuali),
                  puntiOnlineManuali: p.puntiOnlineManuali === null ? "" : formatta(p.puntiOnlineManuali),
                }}
                automatici={{ personale: formatta(automatici.incaricata.punti), online: formatta(automatici.pubblico.punti) }}
              />
            ) : (
              <p className="mt-2 text-sm text-testo-tenue">
                {p.tipo === "licenza"
                  ? "Il rinnovo della licenza non dà punti a nessuno: l'importo va tutto all'azienda (decisione 31)."
                  : `Lo start kit vale ${formatta(parametri.puntiStartKit)} punti fissi: si cambiano dai parametri del piano.`}
              </p>
            )}
          </Scheda>
          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Foto attuale</h2>
            <div className="mt-3 flex h-48 items-center justify-center rounded-lg bg-white p-2">
              {p.immagineId ? (
                <Image src={`/api/immagini/${p.immagineId}`} alt={p.nome} width={150} height={190} unoptimized className="max-h-full w-auto" />
              ) : (
                <span className="text-sm text-neutral-400">Nessuna foto</span>
              )}
            </div>
          </Scheda>
          {amministrazione && (
          <Scheda>
            <h2 className="font-titoli text-xl text-oro-chiaro">Visibilità</h2>
            <p className="mt-2 text-sm text-testo-tenue">
              {p.attivo
                ? "Il prodotto è visibile alle incaricate e si può ordinare."
                : "Il prodotto è nascosto: non si può ordinare."}
            </p>
            <form action={cambiaAttivoProdotto} className="mt-3">
              <input type="hidden" name="id" value={p.id} />
              <input type="hidden" name="attivo" value={p.attivo ? "no" : "si"} />
              <button className="rounded-lg border border-oro/60 px-4 py-2 text-sm text-oro-chiaro">
                {p.attivo ? "Disattiva prodotto" : "Riattiva prodotto"}
              </button>
            </form>
          </Scheda>
          )}
        </div>
      </div>
    </>
  );
}
