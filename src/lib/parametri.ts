/**
 * Parametri del Piano Compensi G LUXE (docs/piano-compensi.md, rev. 6).
 *
 * Nessun numero del piano va scritto nel codice: si legge da qui. I parametri si salvano
 * nel database in versioni con data di efficacia; questi sono i valori iniziali.
 * Importi e punti in centesimi, percentuali in punti base (4% = 400).
 */
import { z } from "zod";

const centesimi = z.coerce.bigint().nonnegative();
const puntiBase = z.coerce.bigint().min(0n).max(10000n);

const schemaQualifica = z.object({ nome: z.string(), soglia: centesimi, percentuale: puntiBase });
const schemaTitolo = z.object({
  nome: z.string(),
  linee: z.number().int().positive(),
  generazioni: z.array(puntiBase),
  quotePool: z.number().int().nonnegative(),
  bonusAuto: centesimi,
});

export const schemaParametri = z.object({
  // Prezzi e punti
  aliquotaIva: puntiBase,
  coefficientePunti: puntiBase,
  scontoIncaricata: puntiBase,
  scontoSuPrezzoIvato: z.boolean(),
  puntiStartKit: centesimi,
  speseSpedizione: centesimi,
  provvigioneOnline: puntiBase,
  /** Provvigione della sponsor sui punti dello start kit di una diretta (decisione 22). */
  provvigioneKitSponsor: puntiBase,
  // Attività e qualifiche
  sogliaAttivita: centesimi,
  tettoAcquistiQualifica: centesimi,
  qualifiche: z.array(schemaQualifica),
  // Zona manager
  /** Punti di gruppo per qualifica perché un diretto sia una linea forte. */
  sogliaLineaForte: centesimi,
  titoli: z.array(schemaTitolo),
  // Pool e figure speciali
  /** Pool manager: percentuale dei punti aziendali del mese (1 punto = 1 €). */
  poolPercentuale: puntiBase,
  // Leader Fondatori
  /** Data di lancio del piano ("AAAA-MM-GG"): i fondatori entrano entro N mesi da qui. Vuota finché non è decisa. */
  dataLancioPiano: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  fondatoriMassimo: z.number().int(),
  fondatoriMesiIngresso: z.number().int(),
  fondatoriDurataMesi: z.number().int(),
  fondatoriPercentualeBloccata: puntiBase,
  fondatoriBonus: puntiBase,
  fondatoriRequisitoPunti: centesimi,
  fondatoriRequisitoGiorni: z.number().int(),
  // Pagamenti e fisco
  pagamentoMinimo: centesimi,
  richiestaDalGiorno: z.number().int().min(1).max(28),
  richiestaAlGiorno: z.number().int().min(1).max(28),
  giornoPagamento: z.number().int().min(1).max(28),
  ritenutaAliquota: puntiBase,
  ritenutaBase: puntiBase,
  inpsAliquota: puntiBase,
  inpsQuotaAzienda: puntiBase,
  inpsBaseImponibile: puntiBase,
  inpsSogliaEsenzione: centesimi,
  /** Bollo sulle ricevute e fatture senza IVA (decisione 28): importo, tolto all'incaricata, oltre la soglia. */
  bolloImporto: centesimi.default(200n),
  bolloSoglia: centesimi.default(7747n),
  // Licenza annuale dell'app (decisione 31). Il prezzo è quello del prodotto "Licenza annuale" nel catalogo.
  licenzaMesi: z.number().int().min(1).max(60).default(12),
  /** Da quanti giorni prima della scadenza si può rinnovare. */
  licenzaAnticipoGiorni: z.number().int().min(0).max(120).default(30),
  /** Giorni prima della scadenza in cui arrivano i due avvisi (email e app). */
  licenzaPrimoAvvisoGiorni: z.number().int().min(1).max(120).default(30),
  licenzaSecondoAvvisoGiorni: z.number().int().min(1).max(120).default(7),
  // Controlli prima della chiusura
  /** Compensi del mese (bonus auto escluso) al massimo questa percentuale dei punti aziendali. */
  limiteCompensiSuPunti: puntiBase,
});

export type Parametri = z.infer<typeof schemaParametri>;

/** Valori iniziali della rev. 6. */
export const PARAMETRI_INIZIALI: Parametri = {
  aliquotaIva: 2200n,
  coefficientePunti: 8000n,
  scontoIncaricata: 4000n,
  scontoSuPrezzoIvato: true,
  puntiStartKit: 3300n,
  speseSpedizione: 690n,
  provvigioneOnline: 5000n,
  provvigioneKitSponsor: 5000n,
  sogliaAttivita: 3300n,
  tettoAcquistiQualifica: 25000n,
  qualifiche: [
    { nome: "New Star", soglia: 10000n, percentuale: 400n },
    { nome: "Partner", soglia: 60000n, percentuale: 800n },
    { nome: "Expert", soglia: 240000n, percentuale: 1200n },
    { nome: "Director", soglia: 600000n, percentuale: 1600n },
    { nome: "Leader", soglia: 1200000n, percentuale: 2000n },
  ],
  sogliaLineaForte: 800000n,
  titoli: [
    { nome: "Leader in crescita", linee: 1, generazioni: [300n], quotePool: 0, bonusAuto: 0n },
    { nome: "Gold Leader", linee: 2, generazioni: [400n], quotePool: 1, bonusAuto: 0n },
    { nome: "Prestige Director", linee: 3, generazioni: [400n, 300n], quotePool: 2, bonusAuto: 30000n },
    { nome: "President", linee: 4, generazioni: [400n, 300n, 200n], quotePool: 3, bonusAuto: 50000n },
    { nome: "Diamond President", linee: 5, generazioni: [400n, 300n, 200n, 200n, 150n], quotePool: 5, bonusAuto: 80000n },
  ],
  poolPercentuale: 300n,
  dataLancioPiano: null,
  fondatoriMassimo: 10,
  fondatoriMesiIngresso: 12,
  fondatoriDurataMesi: 12,
  fondatoriPercentualeBloccata: 1200n,
  fondatoriBonus: 300n,
  fondatoriRequisitoPunti: 100000n,
  fondatoriRequisitoGiorni: 90,
  pagamentoMinimo: 5000n,
  richiestaDalGiorno: 3,
  richiestaAlGiorno: 6,
  giornoPagamento: 20,
  ritenutaAliquota: 2300n,
  ritenutaBase: 7800n,
  // In attesa del commercialista: nessun contributo finché non vengono impostati.
  inpsAliquota: 0n,
  inpsQuotaAzienda: 0n,
  inpsBaseImponibile: 0n,
  inpsSogliaEsenzione: 0n,
  bolloImporto: 200n,
  bolloSoglia: 7747n,
  licenzaMesi: 12,
  licenzaAnticipoGiorni: 30,
  licenzaPrimoAvvisoGiorni: 30,
  licenzaSecondoAvvisoGiorni: 7,
  limiteCompensiSuPunti: 7000n,
};

/** Per salvare nel database (JSON non conosce i bigint): i bigint diventano testo. */
export function parametriInJson(parametri: Parametri): unknown {
  return JSON.parse(JSON.stringify(parametri, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
}

export function parametriDaJson(json: unknown): Parametri {
  return schemaParametri.parse(json);
}
