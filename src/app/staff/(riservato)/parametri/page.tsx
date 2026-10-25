import { Suspense } from "react";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { parametriCorrenti, storicoParametri } from "@/lib/catalogo";
import { dataItaliana } from "@/lib/dati-incaricato";
import { formatta, formattaEuro } from "@/lib/denaro";

export default function Parametri() {
  return (
    <>
      <Titolo sottotitolo="Valori del Piano Compensi G LUXE usati dall'app. La modifica dall'area sede arriverà con la Fase 4 (motore provvigioni).">
        Parametri del piano
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

const pct = (pb: bigint) => `${formatta(pb)}%`.replace(",00%", "%");
const punti = (c: bigint) => formatta(c).replace(",00", "");

async function Contenuto() {
  await richiediStaff(["amministrazione"]);
  const [p, storico] = await Promise.all([parametriCorrenti(), storicoParametri()]);

  const gruppi: [string, [string, string][]][] = [
    [
      "Prezzi e punti",
      [
        ["Aliquota IVA", pct(p.aliquotaIva)],
        ["Punti = coefficiente × prezzo pagato IVA esclusa", pct(p.coefficientePunti)],
        ["Sconto incaricata", pct(p.scontoIncaricata)],
        ["Sconto calcolato sul prezzo", p.scontoSuPrezzoIvato ? "IVA inclusa" : "IVA esclusa"],
        ["Provvigione negozio online (sui punti)", pct(p.provvigioneOnline)],
        ["Punti start kit", punti(p.puntiStartKit)],
        ["Spedizione per ordine", formattaEuro(p.speseSpedizione)],
      ],
    ],
    [
      "Attività e qualifiche",
      [
        ["Punti personali per essere attiva", punti(p.sogliaAttivita)],
        ["Tetto acquisti personali per le soglie", punti(p.tettoAcquistiQualifica)],
        ...p.qualifiche.map((q): [string, string] => [q.nome, `${punti(q.soglia)} punti → ${pct(q.percentuale)}`]),
      ],
    ],
    [
      "Zona manager e pool",
      [
        ...p.titoli.map((t): [string, string] => [
          t.nome,
          `${t.linee} linee · gen. ${t.generazioni.map(pct).join(" + ")} · ${t.quotePool} quote · auto ${formattaEuro(t.bonusAuto)}`,
        ]),
        ["Bloccate contano come linee", p.bloccateContanoComeLinee ? "Sì" : "No"],
        ["Pool manager (sull'incasso)", pct(p.poolPercentuale)],
      ],
    ],
    [
      "Leader Fondatori",
      [
        ["Massimo", String(p.fondatoriMassimo)],
        ["Qualifica bloccata / durata", `${pct(p.fondatoriPercentualeBloccata)} per ${p.fondatoriDurataMesi} mesi`],
        ["Bonus sui punti di gruppo reali", pct(p.fondatoriBonus)],
        ["Requisito", `${punti(p.fondatoriRequisitoPunti)} punti in ${p.fondatoriRequisitoGiorni} giorni`],
      ],
    ],
    [
      "Pagamenti e fisco",
      [
        ["Importo minimo", formattaEuro(p.pagamentoMinimo)],
        ["Richiesta pagamento", `dal ${p.richiestaDalGiorno} al ${p.richiestaAlGiorno} del mese successivo`],
        ["Giorno di pagamento", `${p.giornoPagamento} (o primo giorno lavorativo successivo)`],
        ["Ritenuta d'imposta", `${pct(p.ritenutaAliquota)} sul ${pct(p.ritenutaBase)}`],
        ["INPS", p.inpsAliquota === 0n ? "In attesa del commercialista" : `${pct(p.inpsAliquota)}`],
      ],
    ],
  ];

  return (
    <>
      <p className="mb-4 text-sm text-testo-tenue">
        Versione in vigore dal {dataItaliana(p.validoDal)}.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {gruppi.map(([titolo, righe]) => (
          <Scheda key={titolo}>
            <h2 className="mb-2 font-titoli text-xl text-oro-chiaro">{titolo}</h2>
            <dl className="divide-y divide-bordo text-sm">
              {righe.map(([etichetta, valore]) => (
                <div key={etichetta} className="flex justify-between gap-4 py-2">
                  <dt className="text-testo-tenue">{etichetta}</dt>
                  <dd className="text-right">{valore}</dd>
                </div>
              ))}
            </dl>
          </Scheda>
        ))}
      </div>
      <h2 className="mb-2 mt-8 font-titoli text-xl text-oro-chiaro">Versioni</h2>
      <ul className="text-sm text-testo-tenue">
        {storico.map((v) => (
          <li key={String(v.id)}>
            Dal {dataItaliana(v.validoDal)} · {v.note}
          </li>
        ))}
      </ul>
    </>
  );
}
