import type { PayBillMetadata } from '../../types';

export function extractMetadata(text: string): PayBillMetadata {
  const clean = text.replace(/\r\n/g, '\n');

  // Month extraction (e.g. "Month of : July-2026", "Month of : 07/2026", "July-2026", etc.)
  let month = '';
  const monthMatch =
    clean.match(/Month\s+of\s*:\s*([A-Za-z]+[-/ ]\d{4}|\d{1,2}[-/ ]\d{4})/i) ||
    clean.match(/Month\s*:\s*([A-Za-z]+[-/ ]\d{4}|\d{1,2}[-/ ]\d{4})/i) ||
    clean.match(/([A-Za-z]+-\d{4})/);
  if (monthMatch) {
    month = monthMatch[1].trim();
  }

  const extractField = (patterns: RegExp[]): string => {
    for (const p of patterns) {
      const m = clean.match(p);
      if (m && m[1]) return m[1].trim();
    }
    return '';
  };

  const ddoHrpn = extractField([
    /D\.?D\.?O\s*HRPN\s*:\s*([A-Za-z0-9]+)/i,
    /DDO\s*HRPN\s*:\s*([A-Za-z0-9]+)/i,
  ]);

  const ddoName = extractField([
    /Name\s+of\s+D\.?D\.?O\s*:\s*([^:\n]+?)(?=\s+(?:Name of Ministry|Major Head|TAN|Bill No|Department|Address|\n|$))/i,
    /DDO\s+Name\s*:\s*([^:\n]+?)(?=\s+(?:Name of Ministry|Major Head|TAN|Bill No|\n|$))/i,
  ]);

  const officeName = extractField([
    /Name\s+of\s+Office\s*:\s*([^:\n]+?)(?=\s+(?:Bill No|Major Head|TAN|Cardex|Department|\n|$))/i,
    /Office\s*:\s*([^:\n]+?)(?=\s+(?:Bill No|Major Head|\n|$))/i,
  ]);

  const billNo = extractField([
    /Bill\s+No\.?\s*:\s*([A-Za-z0-9_-]+)/i,
    /Bill\s*Number\s*:\s*([A-Za-z0-9_-]+)/i,
  ]);

  const majorHead = extractField([
    /Major\s+Head\s*:\s*([A-Za-z0-9_-]+)/i,
    /MajorHead\s*:\s*([A-Za-z0-9_-]+)/i,
  ]);

  const ddoCode = extractField([
    /D\.?D\.?O\s*Code\s*(?:No\.?)?\s*:\s*([A-Za-z0-9_-]+)/i,
    /DDO\s*Code\s*:\s*([A-Za-z0-9_-]+)/i,
  ]);

  const department = extractField([
    /Department\s*:\s*([^:\n]+?)(?=\s+(?:TAN No|Cardex No|Address|Taluka|Mobile|\n|$))/i,
  ]);

  const tanNo = extractField([
    /TAN\s*(?:No\.?)?\s*:\s*([A-Za-z0-9]+)/i,
  ]);

  const cardexNo = extractField([
    /Cardex\s*(?:No\.?)?\s*:\s*([A-Za-z0-9]+)/i,
  ]);

  const address = extractField([
    /Address\s*:\s*([^:\n]+?)(?=\s+(?:Cardex No|Mobile No|Taluka|Phone|\n|$))/i,
  ]);

  const mobileNo = extractField([
    /Mobile\s*(?:No\.?)?\s*:\s*([0-9+\s-]{8,15})/i,
  ]);

  const ministry = extractField([
    /Name\s+of\s+Ministry\s*:\s*([^:\n]+?)(?=\s+(?:Major Head|TAN|Department|\n|$))/i,
  ]);

  const email = extractField([
    /E-Mail\s+ID\s*:\s*([^\s\n]+)/i,
  ]);

  const phone = extractField([
    /Phone\s+no\.?\s*:\s*([0-9+\s-]{6,15})/i,
  ]);

  const taluka = extractField([
    /Taluka\s*:\s*([^:\n]+?)(?=\s+(?:Mobile|\n|$))/i,
  ]);

  const generatedDate = extractField([
    /Date\s*:\s*([0-9/:\s-]+)/i,
  ]);

  const billCode = extractField([
    /Billcode\s*:\s*([^\s\n]+)/i,
  ]);

  return {
    month,
    ddoHrpn,
    ddoName,
    officeName,
    billNo,
    majorHead,
    ddoCode,
    department,
    tanNo,
    cardexNo,
    address,
    mobileNo,
    ministry,
    email,
    phone,
    taluka,
    generatedDate,
    billCode,
    rawHeaderDump: clean.slice(0, 1000),
  };
}
