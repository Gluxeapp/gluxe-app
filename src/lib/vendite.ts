/**
 * Vendite a clienti finali (docs/piano-compensi.md, sezione 10): per ogni incaricata e per la sua rete
 * (lei più tutta la downline), quota dei punti ON sul totale dei PP del mese. Modulo puro.
 * Quote in punti base (100% = 10000); null quando non ci sono punti.
 */
import { CENTO_PER_CENTO, dividiArrotondando } from "./denaro";

export type QuotaVendite = {
  on: bigint;
  pp: bigint;
  quota: bigint | null;
  onRete: bigint;
  ppRete: bigint;
  quotaRete: bigint | null;
};

const quota = (on: bigint, pp: bigint) => (pp > 0n ? dividiArrotondando(on * CENTO_PER_CENTO, pp) : null);

export function quoteVendite(
  persone: { id: string; sponsorId: string | null }[],
  punti: Map<string, { on: bigint; pp: bigint }>,
): Map<string, QuotaVendite> {
  const figli = new Map<string, string[]>();
  for (const p of persone) {
    if (!p.sponsorId) continue;
    figli.set(p.sponsorId, [...(figli.get(p.sponsorId) ?? []), p.id]);
  }

  const esito = new Map<string, QuotaVendite>();
  for (const p of persone) {
    const mie = punti.get(p.id) ?? { on: 0n, pp: 0n };
    let onRete = 0n;
    let ppRete = 0n;
    // Visita della rete con l'elenco dei già visti: un eventuale ciclo nella genealogia non blocca il calcolo.
    const visti = new Set<string>();
    const daVisitare = [p.id];
    while (daVisitare.length > 0) {
      const id = daVisitare.pop()!;
      if (visti.has(id)) continue;
      visti.add(id);
      const x = punti.get(id);
      if (x) {
        onRete += x.on;
        ppRete += x.pp;
      }
      daVisitare.push(...(figli.get(id) ?? []));
    }
    esito.set(p.id, { on: mie.on, pp: mie.pp, quota: quota(mie.on, mie.pp), onRete, ppRete, quotaRete: quota(onRete, ppRete) });
  }
  return esito;
}
