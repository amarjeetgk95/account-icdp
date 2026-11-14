/**
 * Section classification + header/footer line detection for table sections.
 */
export function classifySection(headerText: string): 'EARNING' | 'DEDUCTION' {
  const t = headerText;
  if (
    /Deduct/i.test(t) ||
    /9510/.test(t) ||
    /9570/.test(t) ||
    /Net\s*Pay/i.test(t) ||
    /Total\s+Ded/i.test(t) ||
    /Income\s*Tax/i.test(t)
  ) {
    return 'DEDUCTION';
  }
  return 'EARNING';
}

export function isHeaderLine(line: string): boolean {
  return /^Sr\b|^HRPN\b|Employee\s+Name|Income\s+Tax|Prof\s*Tax|Net\s*Pay|Basic\s*Pay|Gross\s*Amt/i.test(line);
}

export function isFooterLine(line: string): boolean {
  return /^(Total\b|I hereby certify|Rupees\s*:|karmyogi)/i.test(line);
}
