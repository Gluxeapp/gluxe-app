import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FoglioDocumento } from "@/components/documento-provvigioni";
import { PulsanteStampa } from "@/components/pulsante-stampa";
import { Caricamento } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { leggiDocumento, percentualiDelDocumento } from "@/lib/provvigioni/conti";

export default function DocumentoStaff({ params }: PageProps<"/staff/contabilita/documento/[id]">) {
  return (
    <Suspense fallback={<Caricamento />}>
      <Contenuto params={params} />
    </Suspense>
  );
}

async function Contenuto({ params }: Pick<PageProps<"/staff/contabilita/documento/[id]">, "params">) {
  await richiediStaff(["amministrazione", "contabilita"]);
  const { id } = await params;
  const d = /^[0-9a-f-]{36}$/i.test(id) ? await leggiDocumento(id) : undefined;
  if (!d) notFound();
  const percentuali = await percentualiDelDocumento(d.parametriVersioneId);
  return (
    <div className="grid gap-4">
      <div className="non-stampare flex flex-wrap items-center justify-between gap-3">
        <Link href="/staff/contabilita" className="text-sm text-testo-tenue">
          ← Contabilità
        </Link>
        <PulsanteStampa />
      </div>
      <FoglioDocumento documento={d} percentuali={percentuali} />
    </div>
  );
}
