import React from 'react';
import type { GTR30FormData } from '../types';
import { numberToWords } from '../services/gtr30Calc.service';

interface Props {
  data: GTR30FormData;
  rupees: number;
}

/**
 * Shared footer for both GTR-30 inner sheets (Earning & Deduction).
 * Replicates the karmyogi.gujarat.gov.in "Pay Bill Inner Sheet" closing:
 *   • Certification statement (centred)
 *   • "Rupees :" / "Rupees (In Words) :" amount lines
 *   • Date line
 *   • DDO signature block (right-aligned): name / designation / office / Cardex
 */
export const GTR30InnerSheetFooter: React.FC<Props> = ({ data, rupees }) => {
  const amount = Math.round(Number(rupees) || 0);
  const words = `${numberToWords(amount)} ONLY`.toUpperCase();
  const dateLine = data.billDate?.trim() ? data.billDate.trim() : '';

  return (
    <React.Fragment>
      <div className="text-center font-sans text-[7pt] font-medium leading-relaxed text-black mt-2">
        I hereby certify that all the particulars furnished above are{' '}
        <span className="font-bold">correct and complete</span>.
      </div>

      <div className="font-sans text-[7pt] leading-relaxed text-black mt-1">
        <div className="flex gap-2 whitespace-nowrap">
          <span className="w-[92px]">Rupees :</span>
          <span className="tabular-nums font-bold">{amount.toLocaleString('en-IN')}</span>
        </div>
        <div className="flex gap-2 mt-[1px]">
          <span className="w-[92px]">Rupees (In Words) :</span>
          <span className="font-semibold break-words">{words}</span>
        </div>
        <div className="flex gap-2 mt-[1px]">
          <span className="w-[92px]">Date :</span>
          <span className="tabular-nums">{dateLine}</span>
        </div>
      </div>

      {/* DDO signature block — bottom-right */}
      <div className="ml-auto mt-3 w-[300px] text-center font-sans text-[7.2pt] leading-[1.3] text-black">
        <div className="font-bold tracking-tight text-slate-900">
          ({data.drawingOfficerName || 'Smt. S.V.Solanki.'})
        </div>
        <div className="text-[6.8pt] font-medium text-slate-700">
          {data.drawingOfficerDesignation || 'Assistant Administrative Cum Account Officer'}
        </div>
        <div className="text-[6.8pt] text-slate-700">
          {data.drawingOfficerOffice || 'Intensive Cattle Development Programme, Surat.'}
        </div>
        <div className="mt-[1px] font-mono text-[6.8pt] font-bold tracking-wide text-black">
          CARDEX No.- {data.cardexNo || '22'}
        </div>
      </div>
    </React.Fragment>
  );
};