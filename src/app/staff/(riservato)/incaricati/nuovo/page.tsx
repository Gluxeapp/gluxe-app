import { Suspense } from "react";
import { Caricamento } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { ModuloNuovoIncaricato } from "./modulo-nuovo";

export default function NuovoIncaricato() {
  return (
    <Suspense fallback={<Caricamento />}>
      <Contenuto />
    </Suspense>
  );
}

async function Contenuto() {
  await richiediStaff(["amministrazione"]);
  return <ModuloNuovoIncaricato />;
}
