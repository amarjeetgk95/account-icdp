import type { PayBillMetadata } from '../../types';

export function extractMetadata(text: string): PayBillMetadata {
  const clean = text.replace(/\r\n/g, '\n');
  let month = '';
  const monthMatch =
    clean.match(/Month\s+of\s*:\s*([A-Za-z]+[-/ ]\d{4}|\d{1,2}[-/ ]\d{4})/i) ||
    clean.match(/Month\s*:\s*([A-Za-z]+[-/ ]\d{4}|\d{1,2}[-/ ]\d{4})/i) ||
    clean.match(/([A-Za-z]+-\d{4})/);
  if (monthMatch) month = monthMatch[1].trim();
  const field = (patterns: RegExp[]): string => {
    for (const p of patterns) {
      const m = clean.match(p);
      if (m?.[1]) return m[1].trim();
    }
    return '';
  };
  return {
    month,
    ddoHrpn: field([/D\.?D\.?O\s*HRPN\s*:\s*([A-Za-z0-9]+)/i]),
    ddoName: field([/Name\s+of\s+D\.?D\.?O\s*:\s*([^:\n]+?)(?=\s+(?:Name of Ministry|Major Head|TAN|Bill No|Department|Address|\n|$))/i]),
    officeName: field([/Name\s+of\s+Office\s*:\s*([^:\n]+?)(?=\s+(?:Bill No|Major Head|TAN|Cardex|Department|\n|$))/i]),
    billNo: field([/Bill\s+No\.?\s*:\s*([A-Za-z0-9_-]+)/i]),
    majorHead: field([/Major\s+Head\s*:\s*([A-Za-z0-9_-]+)/i]),
    ddoCode: field([/D\.?D\.?O\s*Code\s*(?:No\.?)?\s*:\s*([A-Za-z0-9_-]+)/i]),
    department: field([/Department\s*:\s*([^:\n]+?)(?=\s+(?:TAN No|Cardex No|Address|Taluka|Mobile|\n|$))/i]),
    tanNo: field([/TAN\s*(?:No\.?)?\s*:\s*([A-Za-z0-9]+)/i]),
    cardexNo: field([/Cardex\s*(?:No\.?)?\s*:\s*([A-Za-z0-9]+)/i]),
    address: field([/Address\s*:\s*([^:\n]+?)(?=\s+(?:Cardex No|Mobile No|Taluka|Phone|\n|$))/i]),
    mobileNo: field([/Mobile\s*(?:No\.?)?\s*:\s*([0-9+\s-]{8,15})/i]),
    rawHeaderDump: clean.slice(0, 1000),
  };
}
