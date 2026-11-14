/**
 * Internal structural types for the V2 parser. V2TextItem is part of the
 * public surface (re-exported from the barrel); V2Column/V2Section are internal.
 */
export interface V2TextItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
  page: number;
}

export interface V2Column {
  /** Canonical component code ('0103', '9510', 'GROSS', 'TOTDED', 'NETPAY', ...). Null for identity cols. */
  code: string | null;
  /** Header text as printed. */
  label: string;
  /** 'IDENTITY' | 'COMPONENT' | 'TOTAL' | 'NET_PAY' */
  kind: string;
  x: number;
}

export interface V2Section {
  type: 'EARNING' | 'DEDUCTION';
  headerLines: string[];
  headerItems: V2TextItem[];
  headerY: number;
  bodyItems: V2TextItem[];
  bodyLines: string[];
  columns: V2Column[];
  /** X boundary: everything left is identity text, right is numbers. */
  valueBoundaryX: number;
}
