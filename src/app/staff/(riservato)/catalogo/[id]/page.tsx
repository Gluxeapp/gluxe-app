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
import { formatta } from "@/lib/denaro";
import { ModuloProdotto } from "../modulo-prodotto";

export default function SchedaProdottoStaff({ params }: PageProps<"/staff/catalogo/[id]">) {
  return (
    <Suspense fallback={<Caricamento />}>
      <Contenuto params={params} />
    </Suspense>
  );
}

async function Contenuto({ params }: Pick<PageProps<"/staff/catalogo/[id]">, "params">) {
  await richiediStaff(["amministrazione"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [p] = await db().select().from(prodotti).where(eq(prodotti.id, id)).limit(1);
  if (!p) notFound();

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
      <Titolo sottotitolo={`${p.codice} · ${p.attivo ? "attivo" : "disattivato"}${p.tipo === "start_kit" ? " · start kit" : ""}`}>
        {p.nome}
      </Titolo>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ModuloProdotto id={p.id} valori={valori} startKit={p.tipo === "start_kit"} />
        <div className="space-y-6">
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
        </div>
      </div>
    </>
  );
}
