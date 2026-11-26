import Image from "next/image";
import Link from "next/link";
import { SuggerimentoInstallazione } from "@/components/suggerimento-installazione";
import { ModuloAccesso } from "./modulo-accesso";

/**
 * Ciocche d'oro: riprendono le onde dei capelli del logo.
 * Si disegnano una sola volta all'apertura della pagina (niente animazione se il telefono chiede "riduci movimento").
 */
function Ciocche() {
  const ciocche = [
    { d: "M-40 150 C 60 70, 150 210, 260 130 S 420 60, 520 120", spessore: 2.2, opacita: 0.95 },
    { d: "M-40 185 C 70 105, 160 245, 270 165 S 430 95, 520 155", spessore: 1.6, opacita: 0.7 },
    { d: "M-40 220 C 80 140, 170 280, 280 200 S 440 130, 520 190", spessore: 1.2, opacita: 0.5 },
    { d: "M-40 255 C 90 175, 180 315, 290 235 S 450 165, 520 225", spessore: 0.9, opacita: 0.32 },
    { d: "M-40 115 C 50 35, 140 175, 250 95 S 410 25, 520 85", spessore: 0.8, opacita: 0.28 },
  ];
  return (
    <svg
      viewBox="0 0 480 360"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className="accesso-ciocche pointer-events-none absolute inset-0 h-full w-full"
    >
      <defs>
        <linearGradient id="oro-ciocca" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a8802f" stopOpacity="0" />
          <stop offset="0.25" stopColor="#dbad54" />
          <stop offset="0.6" stopColor="#f2d593" />
          <stop offset="1" stopColor="#a8802f" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ciocche.map((c, i) => (
        <path
          key={i}
          d={c.d}
          pathLength={1}
          fill="none"
          stroke="url(#oro-ciocca)"
          strokeWidth={c.spessore}
          strokeLinecap="round"
          opacity={c.opacita}
          style={{ animationDelay: `${i * 140}ms` }}
        />
      ))}
    </svg>
  );
}

export default function Accesso() {
  return (
    <main className="accesso flex flex-1 flex-col lg:flex-row">
      {/* Marchio: logo e ciocche d'oro. Sul telefono è la testata, sul computer la metà sinistra. */}
      <section className="relative flex items-center justify-center overflow-hidden px-6 pt-14 pb-6 lg:sticky lg:top-0 lg:h-svh lg:w-[52%] lg:self-start lg:px-16">
        <Ciocche />
        <div className="relative w-full max-w-[17rem] lg:max-w-md">
          <Image
            src="/brand/logo-g-luxe.png"
            alt="G LUXE · Nata per brillare"
            width={1779}
            height={899}
            priority
            className="accesso-logo w-full"
          />
          <p className="mt-10 hidden text-center font-titoli text-2xl leading-snug text-testo-tenue lg:block">
            Ordini, carriera e provvigioni
            <br />
            in un&apos;unica app.
          </p>
        </div>
      </section>

      {/* Accesso */}
      <section className="flex flex-1 justify-center px-6 pb-12 lg:items-center lg:border-l lg:border-bordo lg:py-16">
        <div className="w-full max-w-sm">
          <h1 className="text-center font-titoli text-[2.75rem] leading-none font-medium tracking-tight testo-oro lg:text-left lg:text-6xl">
            Area Incaricati
          </h1>
          <p className="mt-3 text-center text-sm text-testo-tenue lg:text-left">
            Entra con il tuo codice incaricato e la password.
          </p>

          <div className="mt-8">
            <ModuloAccesso />
          </div>

          <p className="mt-5 text-center text-sm lg:text-right">
            <Link href="/recupero-password" className="text-oro-chiaro underline-offset-4 hover:underline">
              Password dimenticata?
            </Link>
          </p>

          <div className="mt-12 divide-y divide-bordo border-y border-bordo">
            <div className="py-6">
              <h2 className="font-titoli text-2xl text-testo">Non sei ancora incaricata?</h2>
              <p className="mt-1 text-sm text-testo-tenue">Registrati con il codice della tua sponsor.</p>
              <Link href="/registrazione" className="accesso-pulsante-chiaro mt-4">
                Diventa incaricata: registrati
              </Link>
            </div>
            <div className="py-6">
              <h2 className="font-titoli text-2xl text-testo">Sei un cliente?</h2>
              <p className="mt-1 text-sm text-testo-tenue">Acquista i prodotti G LUXE e ritrova i tuoi ordini.</p>
              <Link href="/cliente/registrazione" className="accesso-pulsante-chiaro mt-4">
                Acquista o crea il tuo profilo
              </Link>
              <p className="mt-3 text-center text-sm">
                <Link href="/cliente/accesso" className="text-testo-tenue underline underline-offset-4 hover:text-oro-chiaro">
                  Hai già un profilo? Accedi
                </Link>
              </p>
            </div>
          </div>

          <SuggerimentoInstallazione />

          <p className="mt-10 text-center text-xs text-testo-tenue">
            <Link href="/staff/accesso" className="hover:text-oro-chiaro">
              Accesso amministrazione
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
