/**
 * Cliente VIP (docs/piano-compensi.md, sezione 2a, decisione 35). Modulo puro: niente database.
 * Importi in centesimi, date come testo "AAAA-MM-GG" del calendario italiano; "valida fino" è l'ultimo giorno valido.
 */
import { CENTO_PER_CENTO, dividiArrotondando, formattaEuro, percentuale, type Centesimi } from "./denaro";
import { piuGiorni, piuMesi } from "./licenza";
import type { Parametri } from "./parametri";

type ParametriVip = Pick<Parametri, "vipSoglia" | "vipSconto" | "vipMesi">;

/** Prezzo VIP di un pezzo: listino IVA inclusa meno lo sconto VIP, arrotondato al centesimo. */
export function prezzoVip(listinoIvato: Centesimi, p: ParametriVip): Centesimi {
  return percentuale(listinoIvato, CENTO_PER_CENTO - p.vipSconto);
}

/** Punti per pezzo scritti a mano dalla sede (decisione 27), ridotti dello sconto VIP. */
export function puntiManualiVip(punti: Centesimi, p: ParametriVip): Centesimi {
  return percentuale(punti, CENTO_PER_CENTO - p.vipSconto);
}

/** Status che parte da un pagamento: valido fino al giorno prima dello stesso giorno dopo N mesi. */
export function validaFinoVipDa(pagatoIl: string, p: ParametriVip): string {
  return piuGiorni(piuMesi(pagatoIl, p.vipMesi), -1);
}

/** Riga d'ordine già fotografata, quanto basta per la soglia. */
export type RigaPerVip = { tipoPrezzo: string; quantita: number; totaleIvato: Centesimi; listinoUnitarioIvato: Centesimi | null };

/** Prodotti di un ordine che contano per la soglia (spedizione esclusa). */
export type ConteggioVip = {
  /** Prodotti a listino e in promozione, al prezzo pagato: serve per diventare VIP. */
  pagati: Centesimi;
  /** Prodotti a listino al prezzo pieno (prima dello sconto VIP) più promozioni al loro prezzo: serve per rinnovare. */
  aListino: Centesimi;
};

const PRODOTTI_A_LISTINO = new Set(["listino_pieno", "listino_vip"]);

export function contaProdotti(righe: RigaPerVip[]): ConteggioVip {
  let pagati = 0n;
  let aListino = 0n;
  for (const r of righe) {
    if (r.tipoPrezzo === "promozione") {
      pagati += r.totaleIvato;
      aListino += r.totaleIvato;
    } else if (PRODOTTI_A_LISTINO.has(r.tipoPrezzo)) {
      pagati += r.totaleIvato;
      aListino += (r.listinoUnitarioIvato ?? 0n) * BigInt(r.quantita);
    }
  }
  return { pagati, aListino };
}

/** Voce del registro dello status VIP (solo in aggiunta): attivazione, rinnovo, oppure revoca di una voce precedente. */
export type VoceRegistroVip = {
  id: string;
  tipo: "attivazione" | "rinnovo" | "revoca";
  ordineId: string;
  /** Vuota per le revoche. */
  validaFino: string | null;
  /** Solo per le revoche: la voce annullata. */
  revocaDi: string | null;
};

/** Scadenza dello status: la più lontana tra attivazioni e rinnovi non revocati; null se non è mai stata VIP. */
export function validaFinoVip(registro: VoceRegistroVip[]): string | null {
  const revocate = new Set(registro.filter((v) => v.tipo === "revoca" && v.revocaDi).map((v) => v.revocaDi!));
  let fino: string | null = null;
  for (const v of registro) {
    if (v.tipo === "revoca" || revocate.has(v.id) || !v.validaFino) continue;
    if (!fino || v.validaFino > fino) fino = v.validaFino;
  }
  return fino;
}

export function vipIl(validaFino: string | null, giorno: string): boolean {
  return validaFino !== null && giorno <= validaFino;
}

/**
 * Avviso di scadenza: dovuto da N giorni prima della scadenza fino al giorno della scadenza compreso. Si manda una
 * volta sola per ogni scadenza (lo garantisce il database): se un giorno il controllo salta, parte il giorno dopo.
 */
export function avvisoScadenzaVip(validaFino: string | null, oggi: string, p: Pick<Parametri, "vipAvvisoGiorni">): boolean {
  return validaFino !== null && oggi <= validaFino && oggi >= piuGiorni(validaFino, -p.vipAvvisoGiorni);
}

/**
 * Effetto di un ordine pagato sullo status: con lo status valido il giorno del pagamento si rinnova (valore a listino
 * ≥ soglia); senza, si attiva (prodotti pagati ≥ soglia). Null se l'ordine non arriva alla soglia.
 */
export function esitoVipDelPagamento(d: { validaFinoPrima: string | null; pagatoIl: string; conteggio: ConteggioVip; p: ParametriVip }) {
  const valida = vipIl(d.validaFinoPrima, d.pagatoIl);
  const importo = valida ? d.conteggio.aListino : d.conteggio.pagati;
  if (importo < d.p.vipSoglia) return null;
  return { tipo: valida ? ("rinnovo" as const) : ("attivazione" as const), validaFino: validaFinoVipDa(d.pagatoIl, d.p) };
}

/**
 * Dopo un reso o un rimborso: l'attivazione o il rinnovo di quell'ordine si annulla se i prodotti restanti scendono
 * sotto la soglia. Il rimborso si toglie dai prodotti pagati (la spedizione non si considera rimborsata per prima);
 * per un rinnovo il valore a listino restante segue, in proporzione, la parte pagata restante.
 */
export function daRevocare(d: { tipo: "attivazione" | "rinnovo"; conteggio: ConteggioVip; rimborsato: Centesimi; p: ParametriVip }): boolean {
  const restoPagato = d.conteggio.pagati > d.rimborsato ? d.conteggio.pagati - d.rimborsato : 0n;
  if (d.tipo === "attivazione") return restoPagato < d.p.vipSoglia;
  const restoListino = d.conteggio.pagati === 0n ? 0n : dividiArrotondando(d.conteggio.aListino * restoPagato, d.conteggio.pagati);
  return restoListino < d.p.vipSoglia;
}

/** "2027-12-31" → "31/12/2027" */
export function dataItaliana(giorno: string): string {
  const [a, m, g] = giorno.split("-");
  return `${g}/${m}/${a}`;
}

/** 1500 → "15%", 1250 → "12,5%" */
function percentualeTesto(puntiBase: bigint): string {
  const intero = puntiBase / 100n;
  const resto = puntiBase % 100n;
  return resto === 0n ? `${intero}%` : `${intero},${resto.toString().padStart(2, "0").replace(/0$/, "")}%`;
}

/** Frase del carrello che invita a raggiungere la soglia (o a rinnovare lo status). */
/**
 * barra: se mostrare l'avanzamento verso la soglia. Per una VIP l'invito a rinnovare compare solo vicino alla scadenza
 * (dagli stessi giorni dell'avviso via email, fondatore 23/11/2026); prima si ricorda solo la scadenza e lo sconto.
 */
export function messaggioVip(d: { validaFino: string | null; oggi: string; conteggio: ConteggioVip; p: ParametriVip & Pick<Parametri, "vipAvvisoGiorni"> }): {
  testo: string;
  vip: boolean;
  raggiunto: boolean;
  barra: boolean;
} {
  const sconto = percentualeTesto(d.p.vipSconto);
  const vantaggio = `dal prossimo ordine avrai il ${sconto} di sconto su tutto il listino per ${d.p.vipMesi} mesi.`;
  if (vipIl(d.validaFino, d.oggi)) {
    const scadenza = dataItaliana(d.validaFino!);
    if (!avvisoScadenzaVip(d.validaFino, d.oggi, d.p)) {
      return { vip: true, raggiunto: false, barra: false, testo: `Sei cliente VIP fino al ${scadenza}: i prodotti a listino hanno già il ${sconto} di sconto.` };
    }
    const fino = `Sei cliente VIP fino al ${scadenza}.`;
    const nuova = dataItaliana(validaFinoVipDa(d.oggi, d.p));
    if (d.conteggio.aListino >= d.p.vipSoglia) {
      return { vip: true, raggiunto: true, barra: true, testo: `${fino} Con questo ordine rinnovi il tuo status VIP fino al ${nuova}.` };
    }
    const mancano = formattaEuro(d.p.vipSoglia - d.conteggio.aListino);
    return { vip: true, raggiunto: false, barra: true, testo: `${fino} Ti mancano ${mancano} a listino per rinnovare il tuo status VIP fino al ${nuova}.` };
  }
  if (d.conteggio.pagati >= d.p.vipSoglia) {
    return { vip: false, raggiunto: true, barra: true, testo: `Con questo ordine diventi cliente VIP G LUXE: ${vantaggio}` };
  }
  if (d.conteggio.pagati === 0n) {
    return { vip: false, raggiunto: false, barra: true, testo: `Con un ordine da ${formattaEuro(d.p.vipSoglia)} diventi cliente VIP G LUXE: ${vantaggio}` };
  }
  const mancano = formattaEuro(d.p.vipSoglia - d.conteggio.pagati);
  return { vip: false, raggiunto: false, barra: true, testo: `Ti mancano ${mancano} per diventare cliente VIP G LUXE: ${vantaggio}` };
}
