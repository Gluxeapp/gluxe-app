/**
 * Parametri del Piano Compensi G LUXE (docs/piano-compensi.md, rev. 5).
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
  // Attività e qualifiche
  sogliaAttivita: centesimi,
  tettoAcquistiQualifica: centesimi,
  qualifiche: z.array(schemaQualifica),
  // Zona manager
  bloccateContanoComeLinee: z.boolean(),
  titoli: z.array(schemaTitolo),
  // Pool e figure speciali
  poolPercentuale: puntiBase,
  // Leader Fondatori
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
});

export type Parametri = z.infer<typeof schemaParametri>;

/** Valori iniziali della rev. 5. */
export const PARAMETRI_INIZIALI: Parametri = {
  aliquotaIva: 2200n,
  coefficientePunti: 8000n,
  scontoIncaricata: 4000n,
  scontoSuPrezzoIvato: true,
  puntiStartKit: 3300n,
  speseSpedizione: 690n,
  provvigioneOnline: 5000n,
  sogliaAttivita: 3300n,
  tettoAcquistiQualifica: 25000n,
  qualifiche: [
    { nome: "New Star", soglia: 8000n, percentuale: 400n },
    { nome: "Partner", soglia: 48000n, percentuale: 800n },
    { nome: "Expert", soglia: 120000n, percentuale: 1200n },
    { nome: "Director", soglia: 280000n, percentuale: 1600n },
    { nome: "Leader", soglia: 560000n, percentuale: 2000n },
  ],
  bloccateContanoComeLinee: false,
  titoli: [
    { nome: "Leader in crescita", linee: 1, generazioni: [300n], quotePool: 0, bonusAuto: 0n },
    { nome: "Gold Leader", linee: 2, generazioni: [400n], quotePool: 1, bonusAuto: 0n },
    { nome: "Prestige Director", linee: 3, generazioni: [400n, 300n], quotePool: 2, bonusAuto: 30000n },
    { nome: "President", linee: 4, generazioni: [400n, 300n, 200n], quotePool: 3, bonusAuto: 50000n },
    { nome: "Diamond President", linee: 5, generazioni: [400n, 300n, 200n, 200n, 150n], quotePool: 5, bonusAuto: 80000n },
  ],
  poolPercentuale: 400n,
  fondatoriMassimo: 10,
  fondatoriMesiIngresso: 12,
  fondatoriDurataMesi: 12,
  fondatoriPercentualeBloccata: 1600n,
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
};

/** Per salvare nel database (JSON non conosce i bigint): i bigint diventano testo. */
export function parametriInJson(parametri: Parametri): unknown {
  return JSON.parse(JSON.stringify(parametri, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
}

export function parametriDaJson(json: unknown): Parametri {
  return schemaParametri.parse(json);
}
