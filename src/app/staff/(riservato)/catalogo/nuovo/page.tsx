import { Suspense } from "react";
import { Caricamento, Titolo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { ModuloProdotto } from "../modulo-prodotto";

export default function NuovoProdotto() {
  return (
    <div className="max-w-2xl">
      <Titolo>Nuovo prodotto</Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </div>
  );
}

async function Contenuto() {
  await richiediStaff(["amministrazione"]);
  return <ModuloProdotto />;
}
