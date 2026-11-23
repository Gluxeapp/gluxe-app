import Image from "next/image";
import type { ReactNode } from "react";
import { Avviso } from "@/components/ui";
import type { datiGuadagna } from "@/lib/profilo-cliente";
import { ModuloCandidatura } from "./modulo";

const AUTO = [
  { src: "/guadagna/auto-suv.jpg", larghezza: 1458, altezza: 720, alt: "SUV coupé nero con il logo G LUXE sulla portiera" },
  { src: "/guadagna/auto-berlina.jpg", larghezza: 1458, altezza: 720, alt: "Berlina nera con il logo G LUXE sulla portiera" },
  { src: "/guadagna/auto-compatta.jpg", larghezza: 1195, altezza: 896, alt: "Compatta nera con il logo G LUXE sulla portiera" },
];

/** La pagina vera e propria, senza accessi al database: riceve i testi già pronti. */
export function LandingGuadagna({ d, aperta }: { d: Awaited<ReturnType<typeof datiGuadagna>>; aperta: boolean }) {
  return (
    <div className="space-y-12">
      {/* Apertura */}
      <section className="relative overflow-hidden rounded-2xl border border-oro/40 bg-gradient-to-br from-superficie-alta via-nero to-nero px-5 py-10 text-center sm:px-10">
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-oro/20 blur-3xl" />
        <p className="text-xs uppercase tracking-[0.35em] text-oro-chiaro">Guadagna con G LUXE</p>
        <h1 className="mt-3 font-titoli text-3xl leading-tight font-semibold testo-oro sm:text-5xl">
          Trasforma la tua passione per G&nbsp;LUXE in un&apos;attività tutta tua
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-testo sm:text-base">
          Conosci già i prodotti e ne vedi i risultati. Consigliali alle persone che conosci, con i tempi che scegli tu, e cresci
          insieme a un marchio che punta in alto.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
          <Distintivo>{d.sconto} di sconto sui tuoi acquisti</Distintivo>
          <Distintivo>Il tuo negozio online</Distintivo>
          <Distintivo>Nessun obbligo di orari</Distintivo>
        </div>
        <a href="#candidatura" className="mt-8 inline-block rounded-full bg-oro px-8 py-3 font-semibold text-nero shadow-lg shadow-oro/20">
          Voglio saperne di più
        </a>
      </section>

      {/* Vantaggi */}
      <section>
        <Intestazione sopra="Da subito" titolo="Tre vantaggi dal primo giorno" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Vantaggio icona={<IconaEtichetta />} titolo={`${d.sconto} di sconto`}>
            Compri tutti i prodotti a listino con il {d.sconto} di sconto, per te o per rivenderli.
            {d.esempio && (
              <span className="mt-2 block">
                {d.esempio.nome}: <span className="text-testo-tenue line-through">{d.esempio.listino}</span>{" "}
                <span className="font-semibold text-oro-chiaro">{d.esempio.scontato}</span>
              </span>
            )}
          </Vantaggio>
          <Vantaggio icona={<IconaNegozio />} titolo="Il tuo negozio online">
            Un negozio personale da condividere con un link. Le tue clienti comprano e pagano online, spedizioni comprese; tu ricevi
            il {d.provvigioneOnline} dei punti di ogni ordine.
            {d.esempio && (
              <span className="mt-2 block">
                Su un {d.esempio.nome} a {d.esempio.listino}: <span className="font-semibold text-oro-chiaro">{d.esempio.provvigione}</span>
              </span>
            )}
          </Vantaggio>
          <Vantaggio icona={<IconaOrologio />} titolo="Libertà">
            Nessun obbligo di orari, di zona o di quantità. Decidi tu quanto tempo dedicarci, anche accanto a un altro lavoro.
          </Vantaggio>
        </div>
      </section>

      {/* Carriera */}
      <section>
        <Intestazione sopra="La tua crescita" titolo="Una carriera che cresce con la tua squadra" />
        <p className="mb-5 text-center text-sm text-testo-tenue">
          Puoi presentare G LUXE ad altre persone e creare la tua squadra. Più crescono i punti del gruppo nel mese, più sale la
          percentuale che ricevi.
        </p>
        <ol className="flex items-end justify-between gap-2">
          {d.qualifiche.map((q, i) => (
            <li key={q.nome} className="flex flex-1 flex-col items-center text-center">
              <span className="font-titoli text-lg font-semibold text-oro-chiaro sm:text-2xl">{q.percentuale}</span>
              <span
                className="mt-1 w-full rounded-t-lg bg-gradient-to-t from-oro/30 to-oro"
                style={{ height: `${2.5 + i * 1.6}rem` }}
                aria-hidden
              />
              <span className="mt-2 text-[11px] font-semibold leading-tight sm:text-sm">{q.nome}</span>
              <span className="text-[10px] leading-tight text-testo-tenue sm:text-xs">da {q.soglia} punti</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Incentivi delle Leader */}
      <section className="rounded-2xl border border-oro/40 bg-superficie p-5 sm:p-8">
        <Intestazione sopra="Per chi arriva in alto" titolo="Gli incentivi delle Leader G LUXE" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Vantaggio icona={<IconaSquadra />} titolo="Guadagni sulle generazioni">
            Quando le Leader della tua squadra crescono, guadagni anche sui loro gruppi, per più generazioni.
          </Vantaggio>
          <Vantaggio icona={<IconaCorona />} titolo="Le quote del pool">
            Un guadagno sul totale dei punti di tutta l&apos;azienda, ogni mese, condiviso tra le manager G LUXE. Più l&apos;azienda
            cresce, più cresce anche il pool.
          </Vantaggio>
        </div>

        <div className="mt-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full border border-oro/60 text-oro-chiaro">
            <IconaAuto />
          </div>
          <h3 className="font-titoli text-2xl font-semibold testo-oro sm:text-3xl">L&apos;auto G LUXE</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-testo">
            Per le manager che raggiungono i titoli più alti{d.primoTitoloAuto ? ` (da ${d.primoTitoloAuto} in su)` : ""}, G LUXE riconosce
            ogni mese un bonus auto. Un traguardo da guidare, con il nostro marchio.
          </p>
        </div>
        <div className="-mx-5 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0">
          {AUTO.map((a) => (
            <figure key={a.src} className="w-[80%] shrink-0 snap-center overflow-hidden rounded-xl border border-bordo bg-white sm:w-auto">
              <Image src={a.src} alt={a.alt} width={a.larghezza} height={a.altezza} sizes="(min-width: 640px) 33vw, 80vw" className="h-40 w-full object-cover sm:h-36" />
            </figure>
          ))}
        </div>
        <p className="mt-3 text-center text-[11px] text-testo-tenue">Immagini illustrative.</p>
      </section>

      {/* Come si inizia */}
      <section>
        <Intestazione sopra="Semplice" titolo="Come si inizia" />
        <ol className="grid gap-4 sm:grid-cols-3">
          <Passo numero={1} titolo="Invia la candidatura">
            Bastano un minuto e la tua città. Nessun impegno.
          </Passo>
          <Passo numero={2} titolo="Ti chiama la sede">
            Ti spieghiamo il piano completo e rispondiamo a tutte le tue domande.
          </Passo>
          <Passo numero={3} titolo="Parti con lo start kit">
            {d.startKit ? `Lo start kit costa ${d.startKit}` : "Con lo start kit"}: prodotti, borsa campionario, materiale formativo e il
            primo anno di app{d.licenza ? `; poi la licenza costa ${d.licenza} ogni ${d.licenzaMesi} mesi` : ""}.
          </Passo>
        </ol>
        <p className="mt-4 text-center text-xs text-testo-tenue">
          Per le provvigioni di carriera basta essere attiva: almeno {d.sogliaAttivita} punti nel mese, con i tuoi acquisti o con quelli
          delle tue clienti. La provvigione sulle vendite del negozio la ricevi sempre.
        </p>
      </section>

      {/* Candidatura */}
      <section id="candidatura" className="scroll-mt-6 rounded-2xl border border-oro/60 bg-gradient-to-b from-superficie-alta to-superficie p-5 sm:p-8">
        <h2 className="text-center font-titoli text-3xl font-semibold testo-oro">Ti piacerebbe provarci?</h2>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-testo-tenue">
          Invia la tua candidatura: la sede G LUXE ti contatterà per raccontarti tutto, senza impegno.
        </p>
        <div className="mx-auto mt-6 max-w-md">
          {aperta ? <Avviso tipo="ok">Hai già inviato la tua candidatura: la sede ti contatterà a breve.</Avviso> : <ModuloCandidatura />}
        </div>
      </section>

      <p className="text-center text-[11px] leading-relaxed text-testo-tenue">
        I guadagni dipendono solo dalle vendite e dall&apos;impegno di ciascuna: non esistono guadagni garantiti. Gli incentivi si
        ottengono raggiungendo i requisiti del piano compensi. È un&apos;attività di vendita a domicilio (Legge 173/2005), compatibile
        con altri lavori.
      </p>
    </div>
  );
}

function Distintivo({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-oro/50 bg-nero/60 px-3 py-1 text-oro-chiaro">{children}</span>;
}

function Intestazione({ sopra, titolo }: { sopra: string; titolo: string }) {
  return (
    <div className="mb-5 text-center">
      <p className="text-[11px] uppercase tracking-[0.3em] text-testo-tenue">{sopra}</p>
      <h2 className="mt-1 font-titoli text-2xl font-semibold text-oro-chiaro sm:text-3xl">{titolo}</h2>
    </div>
  );
}

function Vantaggio({ icona, titolo, children }: { icona: ReactNode; titolo: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-bordo bg-superficie p-5">
      <div className="mb-3 flex size-11 items-center justify-center rounded-full border border-oro/60 text-oro-chiaro">{icona}</div>
      <h3 className="font-titoli text-xl text-oro-chiaro">{titolo}</h3>
      <p className="mt-2 text-sm text-testo">{children}</p>
    </div>
  );
}

function Passo({ numero, titolo, children }: { numero: number; titolo: string; children: ReactNode }) {
  return (
    <li className="rounded-xl border border-bordo bg-superficie p-5">
      <span className="flex size-9 items-center justify-center rounded-full bg-oro font-semibold text-nero">{numero}</span>
      <h3 className="mt-3 font-titoli text-xl text-oro-chiaro">{titolo}</h3>
      <p className="mt-1 text-sm text-testo">{children}</p>
    </li>
  );
}

// Icone a linea, nel colore del testo (oro).
const tratto = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-6" aria-hidden {...tratto}>
    {children}
  </svg>
);
const IconaEtichetta = () => svg(<><path d="M3 12V4h8l10 10-8 8L3 12Z" /><circle cx="7.5" cy="8.5" r="1.5" /></>);
const IconaNegozio = () => svg(<><path d="M4 9h16l-1-5H5L4 9Z" /><path d="M5 9v11h14V9" /><path d="M10 20v-6h4v6" /></>);
const IconaOrologio = () => svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>);
const IconaSquadra = () => svg(<><circle cx="12" cy="7" r="3" /><circle cx="5" cy="17" r="2.5" /><circle cx="19" cy="17" r="2.5" /><path d="M12 10v3M12 13l-5 2M12 13l5 2" /></>);
const IconaCorona = () => svg(<><path d="M3 8l4 4 5-7 5 7 4-4-2 11H5L3 8Z" /></>);
const IconaAuto = () => svg(<><path d="M3 16v-3l2-5h14l2 5v3" /><path d="M3 16h18" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /></>);
