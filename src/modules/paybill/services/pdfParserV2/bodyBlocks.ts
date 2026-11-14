import { isHeaderLine, isFooterLine } from './sectionClassifier';
import { HRPN_RE, SKIP_HRPN_PREFIX } from './constants';
import { findDesignation } from './designations';

export function splitBodyBlocks(bodyLines: string[]): Array<{ hrpn: string; text: string }> {
  const anchors: Array<{ idx: number; hrpn: string }> = [];
  let started = false;
  for (let i = 0; i < bodyLines.length; i++) {
    const line = bodyLines[i];
    if (!started) {
      if (isHeaderLine(line)) {
        started = true;
      }
      continue;
    }
    if (/^Total\b|I\s+hereby\s+certify/i.test(line)) break;
    if (isFooterLine(line) || isHeaderLine(line)) continue;
    const m = line.match(HRPN_RE);
    if (!m || SKIP_HRPN_PREFIX.test(m[1])) continue;
    anchors.push({ idx: i, hrpn: m[1] });
  }
  // If no in-body header repeat, accept anchors from the first line.
  if (anchors.length === 0) {
    for (let i = 0; i < bodyLines.length; i++) {
      if (/^Total\b|I\s+hereby\s+certify/i.test(bodyLines[i])) break;
      if (isFooterLine(bodyLines[i]) || isHeaderLine(bodyLines[i])) continue;
      const m = bodyLines[i].match(HRPN_RE);
      if (m && !SKIP_HRPN_PREFIX.test(m[1])) anchors.push({ idx: i, hrpn: m[1] });
    }
  }
  return anchors.map((a, k) => {
    const end = k < anchors.length - 1 ? anchors[k + 1].idx : bodyLines.length;
    let stop = end;
    for (let j = a.idx; j < end; j++) {
      if (j > a.idx && /^Total\b|I\s+hereby\s+certify/i.test(bodyLines[j])) {
        stop = j;
        break;
      }
    }
    return { hrpn: a.hrpn, text: bodyLines.slice(a.idx, stop).join(' ') };
  });
}

export function splitIdentity(textBeforeNums: string, hrpn: string): { name: string; designation: string } {
  // Strip pay-scale / PH / SLO residue first so it never leaks into names.
  const deScaled = textBeforeNums
    .replace(/\bPB-?\d+\s*\(\s*\d{3,5}\s*-\s*\d{3,5}\s*\)\/\d{3,5}/gi, ' ')
    .replace(/\b\d{4,5}-\d{4,5}\/\d{3,4}\b/g, ' ')
    .replace(/\b(?:No|Yes)\s+[PTN]\b/gi, ' ')
    .replace(/\bLevel-?\d+[^(]*(\([^)]*\))?/gi, ' ')
    .replace(/\bFixed\s+Pay\b/gi, ' ');
  const clean = deScaled.replace(hrpn, '').replace(/^\s*\d{1,4}\s+/, '').trim();
  const parts = clean.split(/\s{2,}|\t/);
  let name = (parts[0] || 'Employee').trim();
  let designation = (parts[1] || '').trim();
  if (!designation) {
    const found = findDesignation(clean);
    if (found) {
      // Split AT the post: person name is before it, station (Ambheti,
      // Sayan, Borbodhan...) is after it and belongs to the designation.
      const at = clean.indexOf(found);
      const before = (at >= 0 ? clean.slice(0, at) : name).trim();
      const after = (at >= 0 ? clean.slice(at + found.length) : '').trim();
      designation = after ? `${found} ${after}` : found;
      name = before || name.replace(found, ' ').trim();
    }
  }
  if (!designation) designation = 'Staff';
  // Person names never carry station words anymore (they went to the post).
  name = name.replace(/[0-9/()\\-]/g, ' ').replace(/\s+/g, ' ').trim() || 'Employee';
  return { name, designation };
}
