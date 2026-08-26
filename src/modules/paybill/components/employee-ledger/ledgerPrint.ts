export const LEDGER_PRINT_STYLES = `
          #paybill-employee-ledger-print { padding: 3mm !important; display: block !important; }
          #paybill-employee-ledger-print .no-print,
          #paybill-employee-ledger-print input[type="search"],
          #paybill-employee-ledger-print select,
          #paybill-employee-ledger-print button:not(.keep-in-print) { display: none !important; }
          #paybill-employee-ledger-print .row-action-btn { display: none !important; }
          #paybill-employee-ledger-print input { border: none !important; background: transparent !important; text-align: right !important; padding: 0 !important; font-size: 8.5px !important; }
          #paybill-employee-ledger-print .diff-badge { border: none !important; background: transparent !important; color: #475569 !important; font-size: 7.5px !important; }
          /* Summary bar — compact identity + metric strip for print */
          #paybill-employee-ledger-print .summary-bar { padding: 4px 7px !important; border-radius: 6px !important; }
          #paybill-employee-ledger-print .summary-bar .w-8 { width: 22px !important; height: 22px !important; }
          #paybill-employee-ledger-print .summary-bar .w-8 svg { width: 12px !important; height: 12px !important; }
          #paybill-employee-ledger-print .summary-bar h3 { font-size: 10px !important; }
          #paybill-employee-ledger-print .mini-stat-label { font-size: 7.5px !important; }
          #paybill-employee-ledger-print .mini-stat-value { font-size: 11px !important; }
          #paybill-employee-ledger-print .mini-stat { padding-left: 6px !important; padding-right: 6px !important; }
          /* Remove scroll clipping so whole ledger flows onto one page */
          #paybill-employee-ledger-print,
          #paybill-employee-ledger-print .ledger-scroll { overflow: visible !important; max-height: none !important; min-height: 0 !important; height: auto !important; }
          /* Ledger table — 8.5px body / 7.5px header balances readability vs single-page fit */
          #paybill-employee-ledger-print table { font-size: 8.5px !important; border-collapse: collapse !important; }
          #paybill-employee-ledger-print th, #paybill-employee-ledger-print td { padding: 2px 3px !important; line-height: 1.2 !important; white-space: nowrap !important; }
          #paybill-employee-ledger-print thead th { font-size: 7.5px !important; padding-top: 3px !important; padding-bottom: 3px !important; }
          #paybill-employee-ledger-print .px-4 { padding-left: 6px !important; padding-right: 6px !important; }
          #paybill-employee-ledger-print .py-2\\.5 { padding-top: 3px !important; padding-bottom: 3px !important; }
          /* Ensure whole ledger prints as one flow — no mid-page breaks */
          #paybill-employee-ledger-print > div { break-inside: avoid !important; page-break-inside: avoid !important; }
          @media print {
            @page { margin: 4mm !important; size: A4 landscape; }
            /* Downscale just enough to guarantee one page — 0.86 keeps 11px value readable (~9.5pt) */
            #paybill-employee-ledger-print { zoom: 0.86; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            #paybill-employee-ledger-print [role="alert"] { display: none !important; }
            .no-print { display: none !important; }
          }
        `;
