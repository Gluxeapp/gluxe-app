import Link from "next/link";
import { Suspense } from "react";
import { Caricamento, Scheda } from "@/components/ui";
import { mioProfilo } from "@/lib/dati-incaricato";

export default function Benvenuto() {
  return (
    <Suspense fallback={<Caricamento />}>
      <Contenuto />
    </Suspense>
  );
}

async function Contenuto() {
  const profilo = await mioProfilo();
  return (
    <div className="text-center">
      <h1 className="font-titoli text-4xl font-semibold testo-oro">Benvenuta, {profilo.nome}!</h1>
      <p className="mt-2 text-testo-tenue">La tua registrazione è completata. Nata per brillare.</p>
      <Scheda className="mt-8">
        <p className="text-sm text-testo-tenue">Il tuo codice incaricato</p>
        <p className="mt-2 font-titoli text-5xl font-semibold tracking-wider text-oro-chiaro">{profilo.codice}</p>
        <p className="mt-4 text-sm text-testo-tenue">
          Usalo con la tua password per accedere. Te l&apos;abbiamo inviato anche via email. Dallo alle persone che
          vorranno entrare nel tuo team: sarà il loro codice sponsor.
        </p>
      </Scheda>
      <Link href="/area" className="mt-8 block rounded-lg bg-oro py-3 font-semibold text-nero">
        Entra nell&apos;app
      </Link>
    </div>
  );
}
