/**
 * Requisito del programma Leader Fondatori (docs/piano-compensi.md, 5g e decisione 15):
 * almeno 1.000 punti per qualifica, propri e della downline, dal giorno di ingresso al 90° compreso.
 * Tetto di 250 punti al mese sugli acquisti intestati, per ogni incaricata. Modulo puro.
 */
import type { Centesimi } from "../denaro";
import type { Parametri } from "../parametri";
import type { IncaricataRete, OrdineMese } from "./motore";

export type OrdinePagato = OrdineMese & { /** "AAAA-MM-GG", ora italiana */ pagatoIl: string };

const giorni = (data: string, piu: number) => {
  const d = new Date(`${data}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + piu);
  return d.toISOString().slice(0, 10);
};

/** La fondatrice e tutta la sua downline. */
function reteDi(fondatoreId: string, incaricate: IncaricataRete[]): Set<string> {
  const figli = new Map<string, string[]>();
  for (const i of incaricate) if (i.sponsorId) figli.set(i.sponsorId, [...(figli.get(i.sponsorId) ?? []), i.id]);
  const rete = new Set<string>();
  const daVisitare = [fondatoreId];
  while (daVisitare.length) {
    const id = daVisitare.pop()!;
    if (rete.has(id)) continue;
    rete.add(id);
    daVisitare.push(...(figli.get(id) ?? []));
  }
  return rete;
}

export function puntiRequisitoFondatore(
  fondatoreId: string,
  ingresso: string,
  incaricate: IncaricataRete[],
  ordini: OrdinePagato[],
  p: Parametri,
): Centesimi {
  const fine = giorni(ingresso, p.fondatoriRequisitoGiorni - 1);
  const rete = reteDi(fondatoreId, incaricate);
  // Per incaricata e mese: punti senza tetto (online, kit) e acquisti intestati (con tetto).
  const perMese = new Map<string, { libero: Centesimi; intestati: Centesimi }>();
  for (const o of ordini) {
    if (!rete.has(o.incaricataId) || o.pagatoIl < ingresso || o.pagatoIl > fine) continue;
    const chiave = `${o.incaricataId}\u0000${o.pagatoIl.slice(0, 7)}`;
    const v = perMese.get(chiave) ?? { libero: 0n, intestati: 0n };
    if (o.tipo === "personale") v.intestati += o.punti;
    else v.libero += o.punti;
    perMese.set(chiave, v);
  }
  let totale = 0n;
  for (const v of perMese.values()) {
    totale += v.libero + (v.intestati < p.tettoAcquistiQualifica ? v.intestati : p.tettoAcquistiQualifica);
  }
  return totale;
}

/** Primo mese senza privilegi ("AAAA-MM") se il requisito manca, altrimenti null. */
export function meseDecadenzaFondatore(
  fondatoreId: string,
  ingresso: string,
  incaricate: IncaricataRete[],
  ordini: OrdinePagato[],
  p: Parametri,
): string | null {
  if (puntiRequisitoFondatore(fondatoreId, ingresso, incaricate, ordini, p) >= p.fondatoriRequisitoPunti) return null;
  const fine = new Date(`${giorni(ingresso, p.fondatoriRequisitoGiorni - 1)}T00:00:00Z`);
  const successivo = new Date(Date.UTC(fine.getUTCFullYear(), fine.getUTCMonth() + 1, 1));
  return successivo.toISOString().slice(0, 7);
}
