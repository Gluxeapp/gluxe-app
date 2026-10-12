import Image from "next/image";
import Link from "next/link";
import { Collegamento } from "@/components/ui";
import { SuggerimentoInstallazione } from "@/components/suggerimento-installazione";
import { ModuloAccesso } from "./modulo-accesso";

export default function Accesso() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <Image
          src="/brand/logo-g-luxe.png"
          alt="G LUXE · Nata per brillare"
          width={1779}
          height={899}
          priority
          className="mx-auto w-full max-w-xs"
        />

        <h1 className="mt-6 text-center font-titoli text-3xl font-semibold testo-oro">Area Incaricati</h1>

        <div className="mt-8">
          <ModuloAccesso />
        </div>

        <p className="mt-4 text-center text-sm">
          <Collegamento href="/recupero-password">Password dimenticata?</Collegamento>
        </p>

        <Link
          href="/registrazione"
          className="mt-8 block rounded-lg border border-oro/60 py-3 text-center text-oro-chiaro"
        >
          Diventa incaricata: registrati
        </Link>

        <SuggerimentoInstallazione />

        <p className="mt-10 text-center text-xs text-testo-tenue">
          <Link href="/staff/accesso">Accesso amministrazione</Link>
        </p>
      </div>
    </main>
  );
}
