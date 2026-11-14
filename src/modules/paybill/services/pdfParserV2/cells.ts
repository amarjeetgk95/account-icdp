import { componentMasterService } from '../componentMaster.service';
import type { DetectedComponentInfo } from '../../types';
import type { V2TextItem, V2Section, V2Column } from './types';

/**
 * Reconstruct header CELLS from PDF item coordinates for one page.
 *
 * Karmayogi wraps long headers across two visual rows, e.g. row 1 ends
 * with "Special Additional | Non Private Practice | Gross Amt" while row 2
 * holds "Pay (0101)/(0102) | Allow (0128)". Plain-text clustering joins
 * each visual row into one line, so "Special Additional" and its
 * continuation "Pay (0101)/(0102)" are never adjacent and name-based
 * detection misses the column entirely (Special shares treasury codes
 * 0101/0102 with Basic Pay, so unlike NPPA it has no code fallback and
 * every later amount shifts left — NPPA fetched as 0 for the whole bill).
 *
 * Fragments of one cell share (almost) the same X, so grouping band items
 * by X restores cells: "Special Additional" (x=640.5) + "Pay (0101)/(0102)"
 * (x=642) -> "Special Additional Pay (0101)/(0102)".
 *
 * Returns cells left-to-right, or null when the page has no recognizable
 * table header (caller falls back to text detection).
 */
export function headerCellsForPage(
  pageItems: V2TextItem[]
): Array<{ text: string; x: number }> | null {
  // Anchor labels are whole-string header-only fragments. Deliberately
  // EXCLUDES bare "No": the wrapped "Sr/No" serial header and every data
  // row's PH value ("No") are both exactly "No", so it cannot tell the
  // header band apart from data rows (it would drag the band down into
  // amounts and pollute cells). Every other label below never appears as
  // a whole data/metadata item ("D.D.O HRPN : ..." is one longer string).
  const isAnchor = (s: string) =>
    /^(Sr|HRPN|Employee Name|Designation|Pay Scale|PH|SLO|Basic Pay|Special Additional|Non Private Practice|Gross Amt|Income Tax|Prof Tax|Total Ded|Net Pay)$/i.test(
      (s || '').trim()
    );
  const anchors = pageItems.filter((i) => i.str && isAnchor(i.str));
  if (anchors.length < 2) return null;
  const ys = anchors.map((i) => i.y);
  // Band adapts to the actual header rows on this page (typically 2 rows
  // ~3.5pt apart); data rows start ~10pt+ below and metadata ~25pt+ above.
  const top = Math.max(...ys) + 3;
  const bottom = Math.min(...ys) - 3;
  const band = pageItems.filter(
    (i) => i.str && i.str.trim() && i.y <= top && i.y > bottom
  );
  if (band.length === 0) return null;
  const sorted = [...band].sort((a, b) => a.x - b.x);
  const cols: Array<{ x: number; items: V2TextItem[] }> = [];
  for (const it of sorted) {
    const last = cols[cols.length - 1];
    // Intra-cell fragments share X within ~12pt (e.g. 640.5 vs 642);
    // neighbour columns are 30pt+ apart (PH/SLO at ~14pt merge, but both
    // are identity columns and never become value columns).
    if (last && Math.abs(it.x - last.x) <= 25) {
      last.items.push(it);
    } else {
      cols.push({ x: it.x, items: [it] });
    }
  }
  return cols.map((c) => ({
    x: c.x,
    text: [...c.items]
      .sort((a, b) => b.y - a.y)
      .map((i) => i.str.trim())
      .filter(Boolean)
      .join(' '),
  }));
}

/** Identity cells never become value columns (mirrors the text-path strip). */
export function isIdentityCellText(text: string): boolean {
  return /^(Sr(\s+No)?|No|HRPN|Employee\s+Name|Designation|Pay\s+Scale|PH|SLO)$/i.test(
    (text || '').trim()
  );
}

/**
 * Match reconstructed header cells against the component master, in
 * left-to-right (X) order. Unknown coded cells are kept with their printed
 * code so positional mapping never shifts (mirrors the text detector).
 */
export function detectCells(
  cells: Array<{ text: string; x: number }>,
  sheetType: 'EARNING' | 'DEDUCTION'
): DetectedComponentInfo[] {
  const matcher = componentMasterService.getMatcher();
  const found: DetectedComponentInfo[] = [];
  for (const cell of cells) {
    if (!cell.text || isIdentityCellText(cell.text)) continue;
    const m = matcher.findComponent(cell.text);
    if (m.component && m.matchMethod !== 'UNKNOWN') {
      const comp = m.component;
      const isTotal = comp.kind !== 'COMPONENT';
      if (comp.kind === 'COMPONENT' && comp.type !== sheetType) continue;
      found.push({
        componentId: comp.id,
        componentCode: comp.componentCode,
        componentName: comp.componentName,
        shortName: comp.shortName,
        type: isTotal ? (comp.kind === 'NET_PAY' ? 'NET_PAY' : 'TOTAL') : comp.type,
        kind: comp.kind,
        detectedText: cell.text,
        detectedCode: m.detectedCode || comp.componentCode || undefined,
        matchMethod: m.matchMethod,
        confidence: m.confidence,
        order: 0,
        isTotalField: comp.isTotalField || isTotal,
      });
    } else {
      const codeMatch = cell.text.match(/\((\d{3,4})\)/);
      if (codeMatch) {
        const code = codeMatch[1];
        const label = cell.text
          .replace(/\(\s*\d{3,4}\s*\)/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim();
        found.push({
          componentCode: code,
          componentName: label || `Component ${code}`,
          type: sheetType,
          kind: 'COMPONENT',
          detectedText: cell.text,
          detectedCode: code,
          matchMethod: 'UNKNOWN',
          confidence: 0,
          order: 0,
          isTotalField: false,
        });
      }
    }
  }
  return found.map((f, i) => ({ ...f, order: i }));
}

/**
 * Page-level value columns from item coordinates. Used as an override
 * inside the coordinate row parsers when it finds MORE component columns
 * than the text-derived section columns — i.e. exactly when wrapping hid
 * a column from text detection. Otherwise the section columns are kept so
 * single-line-header bills behave byte-for-byte as before.
 */
export function pageValueColumns(
  pageItems: V2TextItem[],
  section: V2Section,
  type: 'EARNING' | 'DEDUCTION'
): V2Column[] {
  const base = valueColumns(section);
  try {
    const cells = headerCellsForPage(pageItems);
    if (!cells || cells.length === 0) return base;
    const detected = detectCells(cells, type);
    if (detected.length === 0) return base;
    const cols = detectedToColumns(
      detected,
      cells.map((c) => c.text).join(' '),
      type
    ).filter((c) => c.kind === 'COMPONENT');
    return cols.length > base.length ? cols : base;
  } catch {
    return base;
  }
}

export function detectedToColumns(
  detected: DetectedComponentInfo[],
  headerText: string,
  type: 'EARNING' | 'DEDUCTION'
): V2Column[] {
  const cols: V2Column[] = [
    { code: null, label: 'Sr', kind: 'IDENTITY', x: -3 },
    { code: null, label: 'HRPN', kind: 'IDENTITY', x: -2 },
    { code: null, label: 'Name', kind: 'IDENTITY', x: -1 },
  ];
  // Designation is identity for both sides.
  cols.push({ code: null, label: 'Designation', kind: 'IDENTITY', x: 0 });
  const ordered = [...detected].sort((a, b) => (a.order || 0) - (b.order || 0));
  for (const d of ordered) {
    if (d.kind === 'COMPONENT') {
      cols.push({ code: d.componentCode || d.detectedCode || null, label: d.componentName, kind: 'COMPONENT', x: d.order || 0 });
    }
  }
  // Defensive: Karmayogi deduction sheets print BOTH GPF Reg (9670) and
  // GPF Advance (9670). If the component master in the DB predates the
  // GPF Advance row, the detector returns a single 9670 and every later
  // column shifts left by one. Inject the missing Advance column based on
  // raw header text so parsing stays correct with a stale master.
  if (type === 'DEDUCTION' && /GPF\s*Adv/i.test(headerText)) {
    const compCodes = cols.filter((c) => c.kind === 'COMPONENT').map((c) => c.code);
    if (compCodes.filter((c) => c === '9670').length < 2) {
      const regIdx = cols.findIndex((c) => c.kind === 'COMPONENT' && c.code === '9670');
      const synthetic: V2Column = {
        code: '9670',
        label: 'GPF Advance',
        kind: 'COMPONENT',
        x: regIdx >= 0 ? cols[regIdx].x + 0.1 : 45,
      };
      if (regIdx >= 0) cols.splice(regIdx + 1, 0, synthetic);
      else {
        const hbaIdx = cols.findIndex((c) => c.code === '9591');
        cols.splice(hbaIdx >= 0 ? hbaIdx + 1 : cols.length, 0, synthetic);
      }
    }
  }
  // Defensive: "Special Additional Pay" shares treasury codes 0101/0102
  // with Basic Pay, so it is matched by name only. If the component master
  // in the database predates, renamed or deactivated that row (or its
  // aliases), BOTH text and coordinate detection miss it even though the
  // header prints it — and every later amount shifts left (NPPA fetched as
  // 0 for the whole bill). "Special" appears in Karmayogi headers ONLY for
  // this allowance, so synthesize the column and slot it canonically
  // (after Trans/Med, before Washing/NPPA). Same staleness hazard covered
  // symmetrically for Washing (0132) and NPPA (0128) below.
  if (type === 'EARNING' && /Special/i.test(headerText)) {
    const hasSpecial = cols.some(
      (c) => c.kind === 'COMPONENT' && /special|spl/i.test(c.label)
    );
    if (!hasSpecial) {
      insertEarningColumn(
        cols,
        { code: '0101', label: 'Special Additional Pay', kind: 'COMPONENT', x: 0 },
        70
      );
    }
  }
  if (type === 'EARNING' && /Washing\s*Allow|\(0132\)/i.test(headerText)) {
    const hasWashing = cols.some(
      (c) => c.kind === 'COMPONENT' && c.code === '0132'
    );
    if (!hasWashing) {
      insertEarningColumn(
        cols,
        { code: '0132', label: 'Washing Allowance', kind: 'COMPONENT', x: 0 },
        80
      );
    }
  }
  if (type === 'EARNING' && /Non\s+Private\s+Practice|\(0128\)|NPP/i.test(headerText)) {
    const hasNpp = cols.some(
      (c) => c.kind === 'COMPONENT' && c.code === '0128'
    );
    if (!hasNpp) {
      insertEarningColumn(
        cols,
        { code: '0128', label: 'Non Private Practice Allowance', kind: 'COMPONENT', x: 0 },
        90
      );
    }
  }
  for (const d of ordered) {
    if (d.kind === 'TOTAL' || d.kind === 'NET_PAY') {
      cols.push({ code: d.componentCode || null, label: d.componentName, kind: d.kind, x: (d.order || 0) + 0.5 });
    }
  }
  return cols;
}

/**
 * Canonical earning-column rank used to position a defensively synthesized
 * column (see above): Basic 10, DA 20, HRA 30, CLA 40, Med 50, Trans 60,
 * Special 70, Washing 80, NPPA 90. Unknown/arrears columns keep a neutral
 * middle rank so they never force a synthesized column past its neighbours.
 */
export function earningColumnRank(c: V2Column): number {
  if (c.kind !== 'COMPONENT') return 999;
  if ((c.code === '0101' || c.code === '0102') && /special|spl/i.test(c.label)) return 70;
  switch (c.code) {
    case '0101':
    case '0102':
      return 10;
    case '0103':
      return 20;
    case '0110':
      return 30;
    case '0111':
      return 40;
    case '0107':
      return 50;
    case '0113':
      return 60;
    case '0132':
      return 80;
    case '0128':
      return 90;
    default:
      return 65;
  }
}

/** Splice a synthesized column before the first canonical successor. */
export function insertEarningColumn(cols: V2Column[], col: V2Column, rank: number): void {
  let at = cols.length;
  for (let i = 0; i < cols.length; i++) {
    if (cols[i].kind === 'COMPONENT' && earningColumnRank(cols[i]) > rank) {
      at = i;
      break;
    }
  }
  const prevX = at > 0 ? cols[at - 1].x : 0;
  const nextX = at < cols.length ? cols[at].x : prevX + 1;
  col.x = (prevX + nextX) / 2;
  cols.splice(at, 0, col);
}

export function valueColumns(section: V2Section): V2Column[] {
  return section.columns.filter((c) => c.kind === 'COMPONENT');
}

export function firstValueX(columns: V2Column[]): number {
  const v = columns.find((c) => c.kind === 'COMPONENT');
  return v ? v.x : 0;
}
