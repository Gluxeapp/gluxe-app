/**
 * Modulo dell'area sede per una nuova versione dei parametri del piano. Modulo puro:
 * trasforma i parametri in testi all'italiana per il modulo e li rilegge con tutti i controlli.
 * Percentuali in "%" (40 → 4000 punti base), punti ed euro con la virgola (33 → 3300 centesimi).
 */
import { daTesto, formatta } from "./denaro";
import { PARAMETRI_INIZIALI, schemaParametri, type Parametri } from "./parametri";

type Tipo = "percentuale" | "punti" | "euro" | "intero" | "giorno" | "booleano" | "data";
export type CampoParametro = { chiave: keyof Parametri; etichetta: string; tipo: Tipo };

export const GRUPPI_PARAMETRI: { titolo: string; campi: CampoParametro[] }[] = [
  {
    titolo: "Prezzi e punti",
    campi: [
      { chiave: "aliquotaIva", etichetta: "Aliquota IVA (%)", tipo: "percentuale" },
      { chiave: "coefficientePunti", etichetta: "Punti = coefficiente × prezzo IVA esclusa (%)", tipo: "percentuale" },
      { chiave: "scontoIncaricata", etichetta: "Sconto incaricata (%)", tipo: "percentuale" },
      { chiave: "scontoSuPrezzoIvato", etichetta: "Sconto calcolato sul prezzo IVA inclusa", tipo: "booleano" },
      { chiave: "provvigioneOnline", etichetta: "Provvigione online e promozioni (% dei punti)", tipo: "percentuale" },
      { chiave: "provvigioneKitSponsor", etichetta: "Provvigione della sponsor sullo start kit (% dei punti)", tipo: "percentuale" },
      { chiave: "puntiStartKit", etichetta: "Punti dello start kit", tipo: "punti" },
      { chiave: "speseSpedizione", etichetta: "Spedizione per ordine (€)", tipo: "euro" },
    ],
  },
  {
    titolo: "Attività e qualifiche",
    campi: [
      { chiave: "sogliaAttivita", etichetta: "Punti per essere attiva", tipo: "punti" },
      { chiave: "tettoAcquistiQualifica", etichetta: "Tetto acquisti intestati per le soglie (punti)", tipo: "punti" },
    ],
  },
  {
    titolo: "Zona manager e pool",
    campi: [
      { chiave: "sogliaLineaForte", etichetta: "Linea forte: punti di gruppo del diretto", tipo: "punti" },
      { chiave: "poolPercentuale", etichetta: "Pool manager (% dei punti aziendali)", tipo: "percentuale" },
    ],
  },
  {
    titolo: "Leader Fondatori",
    campi: [
      { chiave: "dataLancioPiano", etichetta: "Data di lancio del piano (vuota se non decisa)", tipo: "data" },
      { chiave: "fondatoriMassimo", etichetta: "Numero massimo di fondatori", tipo: "intero" },
      { chiave: "fondatoriMesiIngresso", etichetta: "Ingresso entro (mesi dal lancio)", tipo: "intero" },
      { chiave: "fondatoriDurataMesi", etichetta: "Durata dei privilegi (mesi)", tipo: "intero" },
      { chiave: "fondatoriPercentualeBloccata", etichetta: "Qualifica bloccata (%)", tipo: "percentuale" },
      { chiave: "fondatoriBonus", etichetta: "Bonus sui punti di gruppo reali (%)", tipo: "percentuale" },
      { chiave: "fondatoriRequisitoPunti", etichetta: "Requisito: punti di gruppo", tipo: "punti" },
      { chiave: "fondatoriRequisitoGiorni", etichetta: "Requisito: entro giorni", tipo: "intero" },
    ],
  },
  {
    titolo: "Pagamenti, fisco e controlli",
    campi: [
      { chiave: "pagamentoMinimo", etichetta: "Importo minimo per il pagamento (€)", tipo: "euro" },
      { chiave: "richiestaDalGiorno", etichetta: "Richiesta di pagamento dal giorno", tipo: "giorno" },
      { chiave: "richiestaAlGiorno", etichetta: "Richiesta di pagamento al giorno", tipo: "giorno" },
      { chiave: "giornoPagamento", etichetta: "Giorno di pagamento", tipo: "giorno" },
      { chiave: "ritenutaAliquota", etichetta: "Ritenuta d'imposta (%)", tipo: "percentuale" },
      { chiave: "ritenutaBase", etichetta: "Ritenuta: base imponibile (% dell'importo)", tipo: "percentuale" },
      { chiave: "inpsAliquota", etichetta: "INPS: aliquota (%)", tipo: "percentuale" },
      { chiave: "inpsQuotaAzienda", etichetta: "INPS: quota a carico dell'azienda (%)", tipo: "percentuale" },
      { chiave: "inpsBaseImponibile", etichetta: "INPS: base imponibile (% dei compensi)", tipo: "percentuale" },
      { chiave: "inpsSogliaEsenzione", etichetta: "INPS: soglia di esenzione annua (€)", tipo: "euro" },
      { chiave: "bolloImporto", etichetta: "Bollo su ricevute e fatture senza IVA (€)", tipo: "euro" },
      { chiave: "bolloSoglia", etichetta: "Bollo dovuto oltre (€)", tipo: "euro" },
      { chiave: "licenzaMesi", etichetta: "Licenza annuale: durata (mesi)", tipo: "intero" },
      { chiave: "licenzaAnticipoGiorni", etichetta: "Licenza: rinnovabile da giorni prima della scadenza", tipo: "intero" },
      { chiave: "licenzaPrimoAvvisoGiorni", etichetta: "Licenza: primo avviso (giorni prima)", tipo: "intero" },
      { chiave: "licenzaSecondoAvvisoGiorni", etichetta: "Licenza: secondo avviso (giorni prima)", tipo: "intero" },
      { chiave: "limiteCompensiSuPunti", etichetta: "Limite compensi del mese (% dei punti aziendali)", tipo: "percentuale" },
    ],
  },
];

const numero = (v: bigint) => formatta(v).replace(/,00$/, "");

function testo(tipo: Tipo, v: unknown): string {
  if (tipo === "booleano") return v ? "si" : "no";
  if (tipo === "data") return (v as string | null) ?? "";
  if (tipo === "intero" || tipo === "giorno") return String(v);
  return numero(v as bigint);
}

/** Valori iniziali del modulo, dai parametri in vigore. */
export function valoriDelModulo(p: Parametri): Record<string, string> {
  const v: Record<string, string> = {};
  for (const g of GRUPPI_PARAMETRI) for (const c of g.campi) v[c.chiave] = testo(c.tipo, p[c.chiave]);
  p.qualifiche.forEach((q, i) => {
    v[`qualifiche.${i}.soglia`] = numero(q.soglia);
    v[`qualifiche.${i}.percentuale`] = numero(q.percentuale);
  });
  p.titoli.forEach((t, i) => {
    v[`titoli.${i}.linee`] = String(t.linee);
    v[`titoli.${i}.generazioni`] = t.generazioni.map(numero).join("; ");
    v[`titoli.${i}.quotePool`] = String(t.quotePool);
    v[`titoli.${i}.bonusAuto`] = numero(t.bonusAuto);
  });
  return v;
}

type Esito = { ok: true; parametri: Parametri } | { ok: false; errori: Record<string, string> };

/**
 * Rilegge il modulo. I nomi di qualifiche e titoli e il loro numero restano quelli della versione
 * di partenza (cambiano solo soglie, percentuali e importi): la struttura del piano è nel codice.
 */
export function parametriDaModulo(v: Record<string, string>, base: Parametri = PARAMETRI_INIZIALI): Esito {
  const errori: Record<string, string> = {};
  const leggi = <T>(chiave: string, conv: (s: string) => T, controllo?: (x: T) => string | undefined): T | undefined => {
    try {
      const x = conv((v[chiave] ?? "").trim());
      const problema = controllo?.(x);
      if (problema) {
        errori[chiave] = problema;
        return undefined;
      }
      return x;
    } catch {
      errori[chiave] = "Valore non valido";
      return undefined;
    }
  };
  const intero = (s: string) => {
    if (!/^\d+$/.test(s)) throw new Error();
    return Number(s);
  };
  const nonNegativo = (x: bigint) => (x < 0n ? "Non può essere negativo" : undefined);
  const percento = (x: bigint) => (x < 0n || x > 10000n ? "Tra 0 e 100%" : undefined);

  const out: Record<string, unknown> = {};
  for (const g of GRUPPI_PARAMETRI) {
    for (const c of g.campi) {
      const k = c.chiave;
      if (c.tipo === "percentuale") out[k] = leggi(k, daTesto, percento);
      else if (c.tipo === "punti" || c.tipo === "euro") out[k] = leggi(k, daTesto, nonNegativo);
      else if (c.tipo === "intero") out[k] = leggi(k, intero, (x) => (x < 1 ? "Almeno 1" : undefined));
      else if (c.tipo === "giorno") out[k] = leggi(k, intero, (x) => (x < 1 || x > 28 ? "Tra 1 e 28" : undefined));
      else if (c.tipo === "booleano") out[k] = v[k] === "si";
      else
        out[k] = leggi(
          k,
          (s) => (s === "" ? null : s),
          (x) => (x !== null && !/^\d{4}-\d{2}-\d{2}$/.test(x) ? "Data non valida" : undefined),
        );
    }
  }

  out.qualifiche = base.qualifiche.map((q, i) => ({
    nome: q.nome,
    soglia: leggi(`qualifiche.${i}.soglia`, daTesto, nonNegativo),
    percentuale: leggi(`qualifiche.${i}.percentuale`, daTesto, percento),
  }));
  out.titoli = base.titoli.map((t, i) => ({
    nome: t.nome,
    linee: leggi(`titoli.${i}.linee`, intero, (x) => (x < 1 ? "Almeno 1" : undefined)),
    generazioni: leggi(
      `titoli.${i}.generazioni`,
      (s) => (s === "" ? [] : s.split(";").map((x) => daTesto(x))),
      (xs) => (xs.some((x) => x < 0n || x > 10000n) ? "Percentuali tra 0 e 100, separate da ;" : undefined),
    ),
    quotePool: leggi(`titoli.${i}.quotePool`, (s) => (s === "" ? 0 : intero(s))),
    bonusAuto: leggi(`titoli.${i}.bonusAuto`, daTesto, nonNegativo),
  }));

  // Coerenza fra i valori.
  const q = out.qualifiche as { soglia?: bigint; percentuale?: bigint }[];
  for (let i = 1; i < q.length; i++) {
    if (q[i].soglia !== undefined && q[i - 1].soglia !== undefined && q[i].soglia! <= q[i - 1].soglia!) {
      errori[`qualifiche.${i}.soglia`] = "Deve essere più alta della qualifica precedente";
    }
    if (q[i].percentuale !== undefined && q[i - 1].percentuale !== undefined && q[i].percentuale! <= q[i - 1].percentuale!) {
      errori[`qualifiche.${i}.percentuale`] = "Deve essere più alta della qualifica precedente";
    }
  }
  const t = out.titoli as { linee?: number }[];
  for (let i = 1; i < t.length; i++) {
    if (t[i].linee !== undefined && t[i - 1].linee !== undefined && t[i].linee! <= t[i - 1].linee!) {
      errori[`titoli.${i}.linee`] = "Deve essere più alto del titolo precedente";
    }
  }
  if (typeof out.richiestaDalGiorno === "number" && typeof out.richiestaAlGiorno === "number" && out.richiestaDalGiorno > out.richiestaAlGiorno) {
    errori.richiestaDalGiorno = "Deve venire prima del giorno finale";
  }

  if (Object.keys(errori).length > 0) return { ok: false, errori };
  const letto = schemaParametri.safeParse(out);
  if (!letto.success) {
    return { ok: false, errori: Object.fromEntries(letto.error.issues.map((i) => [i.path.join("."), "Valore non valido"])) };
  }
  return { ok: true, parametri: letto.data };
}
