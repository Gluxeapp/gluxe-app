import Image from "next/image";
import Link from "next/link";
import { SuggerimentoInstallazione } from "@/components/suggerimento-installazione";

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

        <h1 className="mt-6 text-center font-titoli text-3xl font-semibold testo-oro">
          Area Incaricati
        </h1>

        <form className="mt-8 space-y-5" aria-describedby="avviso-fase">
          <div>
            <label htmlFor="codice" className="block text-sm text-testo-tenue">
              Codice incaricato
            </label>
            <input
              id="codice"
              name="codice"
              autoComplete="username"
              autoCapitalize="characters"
              placeholder="GL000123"
              disabled
              className="mt-1 w-full rounded-lg border border-bordo bg-superficie px-4 py-3 text-testo placeholder:text-testo-tenue/60 focus:border-oro focus:outline-none disabled:opacity-60"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm text-testo-tenue">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              disabled
              className="mt-1 w-full rounded-lg border border-bordo bg-superficie px-4 py-3 text-testo focus:border-oro focus:outline-none disabled:opacity-60"
            />
          </div>
          <button
            type="button"
            disabled
            className="w-full rounded-lg bg-oro py-3 font-semibold tracking-wide text-nero disabled:opacity-50"
          >
            Accedi
          </button>
          <p id="avviso-fase" className="text-center text-xs text-testo-tenue">
            L&apos;accesso sarà attivo dalla Fase 1.
          </p>
        </form>

        <Link
          href="/anteprima"
          className="mt-8 block rounded-lg border border-oro/60 py-3 text-center text-oro-chiaro"
        >
          Guarda l&apos;anteprima dell&apos;app
        </Link>

        <SuggerimentoInstallazione />
      </div>
    </main>
  );
}
