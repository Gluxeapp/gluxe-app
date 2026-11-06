/**
 * Rete e carriera (Fase 5). Modulo puro: costruisce l'albero della downline e calcola l'avanzamento.
 *
 * Privacy (CLAUDE.md, regola 15): un nodo porta solo codice, nome e stato (più punti e qualifica, che
 * le pagine prendono dal calcolo del mese); telefono ed email solo delle dirette della radice. Mai IBAN,
 * codice fiscale, indirizzi o provvigioni. L'albero contiene solo la radice e la sua downline.
 */
import type { Centesimi } from "./denaro";
import type { Parametri } from "./parametri";

export type PersonaRete = { id: string; sponsorId: string | null; codice: string; nome: string; stato: string };
export type Contatti = { telefono: string; email: string };

export type NodoRete = {
  id: string;
  codice: string;
  nome: string;
  stato: string;
  livello: number;
  contatti?: Contatti;
  figli: NodoRete[];
};

export function costruisciAlbero(radiceId: string, persone: PersonaRete[], contattiDirette?: Map<string, Contatti>): NodoRete | null {
  const perId = new Map(persone.map((p) => [p.id, p]));
  const figli = new Map<string, PersonaRete[]>();
  for (const p of persone) if (p.sponsorId) figli.set(p.sponsorId, [...(figli.get(p.sponsorId) ?? []), p]);
  const radice = perId.get(radiceId);
  if (!radice) return null;

  const visti = new Set<string>();
  const nodo = (p: PersonaRete, livello: number): NodoRete => {
    visti.add(p.id);
    const n: NodoRete = {
      id: p.id,
      codice: p.codice,
      nome: p.nome,
      stato: p.stato,
      livello,
      figli: (figli.get(p.id) ?? [])
        .filter((f) => !visti.has(f.id)) // difesa contro i cicli (il database li vieta già)
        .sort((a, b) => (a.codice < b.codice ? -1 : 1))
        .map((f) => nodo(f, livello + 1)),
    };
    const contatti = livello === 1 ? contattiDirette?.get(p.id) : undefined;
    if (contatti) n.contatti = { telefono: contatti.telefono, email: contatti.email };
    return n;
  };
  return nodo(radice, 0);
}

/** Persone nella rete (radice esclusa), dirette e profondità. */
export function contaRete(radice: NodoRete) {
  let persone = 0;
  let livelli = 0;
  const visita = (n: NodoRete) => {
    for (const f of n.figli) {
      persone++;
      livelli = Math.max(livelli, f.livello);
      visita(f);
    }
  };
  visita(radice);
  return { persone, dirette: radice.figli.length, livelli };
}

/** Qualifica raggiunta con i punti di gruppo per qualifica e quanto manca alla successiva. */
export function avanzamentoQualifica(pgq: Centesimi, qualifiche: Parametri["qualifiche"]) {
  const ordinate = [...qualifiche].sort((a, b) => (a.soglia < b.soglia ? -1 : 1));
  const attuale = ordinate.filter((q) => pgq >= q.soglia).at(-1);
  const prossima = ordinate.find((q) => q.soglia > pgq);
  return {
    attuale: attuale?.nome ?? null,
    prossima: prossima?.nome ?? null,
    soglia: prossima?.soglia ?? attuale?.soglia ?? 0n,
    mancano: prossima ? prossima.soglia - pgq : 0n,
    // Solo per la barra: percentuale intera, arrotondata per difetto.
    percentuale: prossima ? Number((pgq * 100n) / prossima.soglia) : 100,
  };
}

/** Titolo manager con le linee forti attuali e linee mancanti per il successivo. */
export function prossimoTitolo(lineeForti: number, titoli: Parametri["titoli"]) {
  const ordinati = [...titoli].sort((a, b) => a.linee - b.linee);
  const attuale = ordinati.filter((t) => lineeForti >= t.linee).at(-1);
  const prossimo = ordinati.find((t) => t.linee > lineeForti);
  return { attuale: attuale?.nome ?? null, prossimo: prossimo?.nome ?? null, lineeMancanti: prossimo ? prossimo.linee - lineeForti : 0 };
}
