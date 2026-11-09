/**
 * File dei bonifici SEPA (SEPA Credit Transfer) per l'home banking: XML ISO 20022 pain.001.001.03,
 * profilo italiano CBI (docs/piano-compensi.md, sezione 8c). Modulo puro.
 */
import { ibanValido, normalizzaIban } from "./validazioni";

export const VERSIONE_CBI = "CBIPaymentRequest.00.04.00";

export type Ordinante = {
  ragioneSociale: string;
  /** Codice fiscale o partita IVA dell'azienda. */
  codiceFiscale: string;
  iban: string;
  /** Codice CUC assegnato dalla banca (identifica l'azienda nei flussi CBI). */
  cuc: string;
};

export type Bonifico = {
  /** Identificativo univoco del bonifico (max 35 caratteri), per ritrovarlo nell'estratto conto. */
  riferimento: string;
  beneficiario: string;
  iban: string;
  /** Centesimi, positivo. */
  importo: bigint;
  causale: string;
};

export type Distinta = {
  /** Identificativo univoco del file (max 35 caratteri). */
  idMessaggio: string;
  /** "AAAA-MM-GGTHH:MM:SS", ora italiana. */
  creatoIl: string;
  /** Data di esecuzione "AAAA-MM-GG". */
  dataEsecuzione: string;
  ordinante: Ordinante;
  bonifici: Bonifico[];
};

/**
 * Caratteri ammessi nei bonifici SEPA: lettere senza accento, cifre, spazio e / - ? : ( ) . , ' +.
 * Le lettere accentate perdono l'accento, il resto diventa spazio; poi si taglia alla lunghezza massima.
 */
export function testoSepa(testo: string, massimo: number): string {
  return testo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 /\-?:().,'+]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, massimo)
    .trim();
}

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&apos;").replace(/"/g, "&quot;");
const euro = (c: bigint) => `${c / 100n}.${(c % 100n).toString().padStart(2, "0")}`;

export class ErroreDistinta extends Error {}

/** Codice ABI della banca, dalle posizioni 6-10 di un IBAN italiano. */
export function abiDaIban(iban: string): string {
  const i = normalizzaIban(iban);
  if (!i.startsWith("IT")) throw new ErroreDistinta("L'IBAN dell'azienda deve essere italiano");
  return i.slice(5, 10);
}

export function distintaSepaCbi(d: Distinta): string {
  if (d.bonifici.length === 0) throw new ErroreDistinta("Nessun bonifico nel file");
  const ibanAzienda = normalizzaIban(d.ordinante.iban);
  if (!ibanValido(ibanAzienda)) throw new ErroreDistinta("IBAN dell'azienda non valido");
  if (!/^[A-Z0-9]{8}$/i.test(d.ordinante.cuc.trim())) throw new ErroreDistinta("Codice CUC non valido (8 caratteri)");
  const riferimenti = new Set<string>();
  for (const b of d.bonifici) {
    if (b.importo <= 0n) throw new ErroreDistinta(`Importo non valido per ${b.riferimento}`);
    if (!ibanValido(b.iban)) throw new ErroreDistinta(`IBAN non valido per ${b.riferimento}`);
    if (riferimenti.has(b.riferimento)) throw new ErroreDistinta(`Bonifico ripetuto: ${b.riferimento}`);
    riferimenti.add(b.riferimento);
  }
  const totale = d.bonifici.reduce((t, b) => t + b.importo, 0n);
  const nome = xml(testoSepa(d.ordinante.ragioneSociale, 70));

  const righe = d.bonifici.map(
    (b, i) => `    <CdtTrfTxInf>
      <PmtId>
        <InstrId>${i + 1}</InstrId>
        <EndToEndId>${xml(testoSepa(b.riferimento, 35))}</EndToEndId>
      </PmtId>
      <Amt>
        <InstdAmt Ccy="EUR">${euro(b.importo)}</InstdAmt>
      </Amt>
      <Cdtr>
        <Nm>${xml(testoSepa(b.beneficiario, 70))}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${normalizzaIban(b.iban)}</IBAN>
        </Id>
      </CdtrAcct>
      <RmtInf>
        <Ustrd>${xml(testoSepa(b.causale, 140))}</Ustrd>
      </RmtInf>
    </CdtTrfTxInf>`,
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<CBIPaymentRequest xmlns="urn:CBI:xsd:${VERSIONE_CBI}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <GrpHdr>
    <MsgId>${xml(testoSepa(d.idMessaggio, 35))}</MsgId>
    <CreDtTm>${d.creatoIl}</CreDtTm>
    <NbOfTxs>${d.bonifici.length}</NbOfTxs>
    <CtrlSum>${euro(totale)}</CtrlSum>
    <InitgPty>
      <Nm>${nome}</Nm>
      <Id>
        <OrgId>
          <Othr>
            <Id>${xml(d.ordinante.cuc.trim().toUpperCase())}</Id>
            <Issr>CBI</Issr>
          </Othr>
        </OrgId>
      </Id>
    </InitgPty>
  </GrpHdr>
  <PmtInf>
    <PmtInfId>${xml(testoSepa(d.idMessaggio, 35))}</PmtInfId>
    <PmtMtd>TRF</PmtMtd>
    <PmtTpInf>
      <InstrPrty>NORM</InstrPrty>
      <SvcLvl>
        <Cd>SEPA</Cd>
      </SvcLvl>
    </PmtTpInf>
    <ReqdExctnDt>${d.dataEsecuzione}</ReqdExctnDt>
    <Dbtr>
      <Nm>${nome}</Nm>
      <Id>
        <OrgId>
          <Othr>
            <Id>${xml(d.ordinante.codiceFiscale.trim().toUpperCase())}</Id>
            <Issr>ADE</Issr>
          </Othr>
        </OrgId>
      </Id>
    </Dbtr>
    <DbtrAcct>
      <Id>
        <IBAN>${ibanAzienda}</IBAN>
      </Id>
    </DbtrAcct>
    <DbtrAgt>
      <FinInstnId>
        <ClrSysMmbId>
          <MmbId>${abiDaIban(ibanAzienda)}</MmbId>
        </ClrSysMmbId>
      </FinInstnId>
    </DbtrAgt>
    <ChrgBr>SLEV</ChrgBr>
${righe.join("\n")}
  </PmtInf>
</CBIPaymentRequest>
`;
}
