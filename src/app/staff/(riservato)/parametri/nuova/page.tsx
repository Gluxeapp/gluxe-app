import Link from "next/link";
import { Suspense } from "react";
import { Caricamento, Titolo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { parametriCorrenti } from "@/lib/catalogo";
import { GRUPPI_PARAMETRI, valoriDelModulo } from "@/lib/parametri-modulo";
import { giornoDiOggi } from "@/lib/provvigioni/dati";
import { ModuloParametri } from "./modulo";

export default function NuovaVersione() {
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/staff/parametri" className="text-testo-tenue">
          ← Parametri del piano
        </Link>
      </p>
      <Titolo sottotitolo="Parti dai valori in vigore e cambia solo quelli che servono. La versione attuale non si modifica: ne nasce una nuova, valida dalla data che scegli. Ogni modifica deve essere già approvata e scritta in docs/piano-compensi.md.">
        Nuova versione dei parametri
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

async function Contenuto() {
  await richiediStaff(["amministrazione"]);
  const [p, oggi] = await Promise.all([parametriCorrenti(), giornoDiOggi()]);
  return (
    <ModuloParametri
      gruppi={GRUPPI_PARAMETRI}
      qualifiche={p.qualifiche.map((q) => q.nome)}
      titoli={p.titoli.map((t) => t.nome)}
      valori={valoriDelModulo(p)}
      oggi={oggi}
    />
  );
}
