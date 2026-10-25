import Link from "next/link";
import { Suspense } from "react";
import { Caricamento, Scheda } from "@/components/ui";
import { mioProfilo } from "@/lib/dati-incaricato";

export default function HomeArea() {
  return (
    <Suspense fallback={<Caricamento />}>
      <Contenuto />
    </Suspense>
  );
}

const sezioni = [
  { href: "/area/prodotti", titolo: "Prodotti", testo: "Listino e promozioni", fase: 0 },
  { href: "/area/ordini", titolo: "Ordini", testo: "Nuovo ordine e stato dei tuoi ordini", fase: 3 },
  { href: "/area/carriera", titolo: "Carriera", testo: "Qualifica, avanzamento e la tua rete", fase: 5 },
  { href: "/area/provvigioni", titolo: "Provvigioni", testo: "Maturate, disponibili e pagate", fase: 6 },
];

async function Contenuto() {
  const profilo = await mioProfilo();
  return (
    <>
      <h1 className="font-titoli text-3xl font-semibold text-testo">Ciao {profilo.nome}</h1>
      <p className="mt-1 text-sm text-testo-tenue">
        Codice incaricato <span className="font-semibold text-oro-chiaro">{profilo.codice}</span> · Sponsor{" "}
        {profilo.sponsor}
      </p>
      {profilo.stato === "sospeso" && (
        <p className="mt-4 rounded-lg border border-errore/50 bg-errore/10 p-4 text-sm text-errore">
          Il tuo account è sospeso: contatta l&apos;azienda.
        </p>
      )}
      <div className="mt-6 grid gap-4">
        {sezioni.map((s) => (
          <Link key={s.href} href={s.href}>
            <Scheda>
              <p className="font-titoli text-xl text-oro-chiaro">{s.titolo}</p>
              <p className="mt-1 text-sm text-testo-tenue">{s.testo}</p>
              {s.fase > 0 && (
                <p className="mt-3 inline-block rounded-full border border-oro/40 px-3 py-0.5 text-xs text-testo-tenue">
                  In arrivo nella Fase {s.fase}
                </p>
              )}
            </Scheda>
          </Link>
        ))}
      </div>
    </>
  );
}
