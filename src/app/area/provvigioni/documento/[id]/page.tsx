import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FoglioDocumento } from "@/components/documento-provvigioni";
import { PulsanteStampa } from "@/components/pulsante-stampa";
import { Caricamento } from "@/components/ui";
import { richiediIncaricataOperativa } from "@/lib/accesso";
import { leggiDocumento, percentualiDelDocumento } from "@/lib/provvigioni/conti";

export default function DocumentoIncaricata({ params }: PageProps<"/area/provvigioni/documento/[id]">) {
  return (
    <Suspense fallback={<Caricamento />}>
      <Contenuto params={params} />
    </Suspense>
  );
}

async function Contenuto({ params }: Pick<PageProps<"/area/provvigioni/documento/[id]">, "params">) {
  const { incaricato } = await richiediIncaricataOperativa();
  const { id } = await params;
  // Solo i propri documenti (CLAUDE.md, regola 15): un documento altrui risponde "non trovato".
  const d = /^[0-9a-f-]{36}$/i.test(id) ? await leggiDocumento(id) : undefined;
  if (!d || d.incaricatoId !== incaricato.id) notFound();
  const percentuali = await percentualiDelDocumento(d.parametriVersioneId);
  return (
    <div className="grid gap-4">
      <div className="non-stampare flex flex-wrap items-center justify-between gap-3">
        <Link href="/area/provvigioni" className="text-sm text-testo-tenue">
          ← Provvigioni
        </Link>
        <PulsanteStampa />
      </div>
      <FoglioDocumento documento={d} percentuali={percentuali} />
    </div>
  );
}
