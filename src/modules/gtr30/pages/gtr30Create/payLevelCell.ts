/**
 * Pay-level/cell helpers shared by the GTR-30 create page and its extracted sub-components.
 */
export const parsePayLevelCell = (raw: string): { level: string; cell: string } => {
  const match = /LEVEL[-\s]*(\d+)?\s*CELL-(\d+)/i.exec(raw || '');
  return { level: match?.[1] ?? '', cell: match?.[2] ?? '' };
};

export const composePayLevelCell = (pay: number, level: string, cell: string): string => {
  const l = level.trim();
  const c = cell.trim();
  if (!l && !c) return '';
  const levelPart = l ? `LEVEL-${l}` : 'LEVEL';
  const cellPart = c ? ` CELL-${c}` : '';
  return `PAY=${pay} (${levelPart}${cellPart})`;
};
