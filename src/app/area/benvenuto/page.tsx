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
      <p className="mt-2 text-testo-tenue">I tuoi dati sono registrati. Nata per brillare.</p>
      <Scheda className="mt-8">
        <p className="text-sm text-testo-tenue">Il tuo codice incaricato</p>
        <p className="mt-2 font-titoli text-5xl font-semibold tracking-wider text-oro-chiaro">{profilo.codice}</p>
        <p className="mt-4 text-sm text-testo-tenue">
          Usalo con la tua password per accedere. Te l&apos;abbiamo inviato anche via email. Dallo alle persone che
          vorranno entrare nel tuo team: sarà il loro codice sponsor.
        </p>
      </Scheda>
      <Scheda className="mt-6">
        <p className="font-titoli text-xl text-oro-chiaro">Ultimo passo: lo start kit</p>
        <p className="mt-2 text-sm text-testo-tenue">
          Il tuo account si attiva con il pagamento dello start kit (carta, PayPal o Klarna).
        </p>
      </Scheda>
      <Link href="/area/start-kit" className="mt-6 block rounded-lg bg-oro py-3 font-semibold text-nero">
        Paga lo start kit
      </Link>
      <Link href="/area" className="mt-4 block text-sm text-testo-tenue">
        Lo farò più tardi
      </Link>
    </div>
  );
}
