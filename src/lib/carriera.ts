import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { incaricati, utenti } from "@/db/schema";
import { formatta } from "./denaro";
import { calcoloDelMese, meseCorrente, reteCompleta, type CalcoloDelMese } from "./provvigioni/dati";
import { costruisciAlbero, type NodoRete } from "./rete";

/**
 * Dati per la pagina Carriera e per l'albero della sede (Fase 5). Solo lettura.
 * Le pagine controllano prima chi è collegato; qui si sceglie cosa può uscire.
 */

/** Nodo pronto per la pagina: dati consentiti e numeri già scritti all'italiana. */
export type VistaNodo = {
  id: string;
  codice: string;
  nome: string;
  stato: string;
  livello: number;
  contatti?: { telefono: string; email: string };
  qualifica: string | null;
  percentuale: string;
  puntiPersonali: string;
  puntiGruppo: string;
  attiva: boolean;
  titolo: string | null;
  figli: VistaNodo[];
};

const pct = (pb: bigint) => `${formatta(pb)}%`.replace(",00%", "%");

function vista(n: NodoRete, calcolo: CalcoloDelMese): VistaNodo {
  const s = calcolo.situazioni.find((x) => x.id === n.id);
  return {
    id: n.id,
    codice: n.codice,
    nome: n.nome,
    stato: n.stato,
    livello: n.livello,
    contatti: n.contatti,
    qualifica: s?.qualificaReale ?? null,
    percentuale: pct(s?.percentualeApplicata ?? 0n),
    puntiPersonali: formatta(s?.pp ?? 0n),
    puntiGruppo: formatta(s?.pgq ?? 0n),
    attiva: s?.attiva ?? false,
    titolo: s?.titolo ?? null,
    figli: n.figli.map((f) => vista(f, calcolo)),
  };
}

/** Ultimi 12 mesi, dal più recente: quelli che si possono scegliere. */
export async function mesiDisponibili(): Promise<string[]> {
  const corrente = await meseCorrente();
  const [a, m] = corrente.split("-").map(Number);
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - i, 1));
    return d.toISOString().slice(0, 7);
  });
}

async function persone() {
  return (await reteCompleta()).map((i) => ({ id: i.id, sponsorId: i.sponsor_id, codice: i.codice, nome: i.nome, stato: i.stato }));
}

/** Carriera dell'incaricata collegata: la sua situazione del mese e l'albero della sua sola downline. */
export async function carrieraIncaricata(incaricataId: string, mese: string) {
  const [calcolo, elenco, dirette] = await Promise.all([
    calcoloDelMese(mese),
    persone(),
    // Contatti solo delle dirette (regola 15).
    db()
      .select({ id: incaricati.id, telefono: incaricati.telefono, email: utenti.email })
      .from(incaricati)
      .innerJoin(utenti, eq(utenti.id, incaricati.utenteId))
      .where(eq(incaricati.sponsorId, incaricataId)),
  ]);
  const albero = costruisciAlbero(incaricataId, elenco, new Map(dirette.map((d) => [d.id, { telefono: d.telefono, email: d.email }])));
  if (!albero) throw new Error("Incaricata non trovata");
  const io = calcolo.situazioni.find((s) => s.id === incaricataId);
  return { albero: vista(albero, calcolo), io, parametri: calcolo.parametri, nodoRete: albero };
}

/** Albero per la sede: da un'incaricata o, senza, tutta la rete a partire dalle capostipiti. */
export async function reteSede(mese: string, radiceId?: string) {
  const [calcolo, elenco] = await Promise.all([calcoloDelMese(mese), persone()]);
  const radici = radiceId ? [radiceId] : elenco.filter((p) => p.sponsorId === null).map((p) => p.id);
  const alberi = radici
    .map((id) => costruisciAlbero(id, elenco))
    .filter((a): a is NodoRete => a !== null)
    .sort((a, b) => (a.codice < b.codice ? -1 : 1));
  return { alberi: alberi.map((a) => vista(a, calcolo)), nodi: alberi, totale: elenco.length };
}
