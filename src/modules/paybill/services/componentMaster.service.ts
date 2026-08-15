import { supabase } from '@/core/supabase/client';
import type {
  ComponentMatchMethod,
  ComponentMatchResult,
  DetectedComponentInfo,
  PayrollComponent,
  PayrollComponentAlias,
  PayrollComponentKind,
  PayrollComponentType,
  PayrollComponentValidationRule,
} from '../types/componentMaster';

/**
 * ---------------------------------------------------------------------------
 * Normalization helpers
 * ---------------------------------------------------------------------------
 */

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Remove parenthetical component codes e.g. "(0103)" from header text. */
function stripParentheticalCodes(value: string): string {
  return value.replace(/\(\s*\d{3,4}\s*\)/g, ' ');
}

function extractFirstCode(value: string): string | undefined {
  const m = value.match(/\((\d{3,4})\)/);
  return m ? m[1] : undefined;
}

function isFuzzyMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (Math.min(a.length, b.length) < 3) return false;
  const maxDist = Math.max(2, Math.floor(Math.min(a.length, b.length) * 0.3));
  return levenshteinDistance(a, b) <= maxDist;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return curr[n];
}

/**
 * ---------------------------------------------------------------------------
 * Default component master (in-code seed)
 *
 * Mirrors the database seed so the PDF parser works standalone (tests, offline,
 * before the database is migrated). The repository merges database rows on top
 * of these defaults, so the master can be extended without code changes.
 * ---------------------------------------------------------------------------
 */

export interface DefaultComponentSeed {
  componentCode: string;
  componentName: string;
  shortName?: string;
  type: PayrollComponentType;
  kind: PayrollComponentKind;
  category?: string;
  displayOrder: number;
  isMandatory?: boolean;
  isTotalField?: boolean;
  isSystemGenerated?: boolean;
  headerAliases: string[];
  codeAliases: string[];
  notes?: string;
}

export const DEFAULT_COMPONENT_SEED: DefaultComponentSeed[] = [
  {
    componentCode: '0101',
    componentName: 'Basic Pay',
    shortName: 'Basic',
    type: 'EARNING',
    kind: 'COMPONENT',
    category: 'Salary',
    displayOrder: 10,
    isMandatory: true,
    headerAliases: ['Basic Pay', 'Basic', 'Basic Pay (0101)/(0102)', 'Basic Pay (0101)', 'Basic Pay (0102)'],
    codeAliases: ['0101', '0102'],
  },
  {
    componentCode: '0103',
    componentName: 'DA',
    shortName: 'DA',
    type: 'EARNING',
    kind: 'COMPONENT',
    category: 'Allowance',
    displayOrder: 20,
    isMandatory: true,
    headerAliases: ['DA', 'Dearness Allowance', 'DA (0103)', 'Dearness Allow'],
    codeAliases: ['0103'],
  },
  {
    componentCode: '0110',
    componentName: 'HRA',
    shortName: 'HRA',
    type: 'EARNING',
    kind: 'COMPONENT',
    category: 'Allowance',
    displayOrder: 30,
    isMandatory: true,
    headerAliases: ['HRA', 'House Rent Allowance', 'HRA (0110)', 'House Rent Allow'],
    codeAliases: ['0110'],
  },
  {
    componentCode: '0111',
    componentName: 'CLA',
    shortName: 'CLA',
    type: 'EARNING',
    kind: 'COMPONENT',
    category: 'Allowance',
    displayOrder: 40,
    isMandatory: true,
    headerAliases: ['CLA', 'City Compensatory Allowance', 'CLA (0111)', 'Compensatory Local Allowance'],
    codeAliases: ['0111'],
  },
  {
    componentCode: '0107',
    componentName: 'Medical Allowance',
    shortName: 'Med Allow',
    type: 'EARNING',
    kind: 'COMPONENT',
    category: 'Allowance',
    displayOrder: 50,
    isMandatory: true,
    headerAliases: ['Med Allow', 'Medical Allowance', 'Med', 'Med Allow (0107)', 'Medical Allow'],
    codeAliases: ['0107'],
  },
  {
    componentCode: '0113',
    componentName: 'Transport Allowance',
    shortName: 'Trans Allow',
    type: 'EARNING',
    kind: 'COMPONENT',
    category: 'Allowance',
    displayOrder: 60,
    isMandatory: true,
    headerAliases: ['Trans Allow', 'Transport Allowance', 'Trans', 'Trans Allow (0113)', 'Transport Allow'],
    codeAliases: ['0113'],
  },
  {
    componentCode: '0128',
    componentName: 'Non Private Practice Allowance',
    shortName: 'NPP Allow',
    type: 'EARNING',
    kind: 'COMPONENT',
    category: 'Allowance',
    displayOrder: 70,
    headerAliases: ['Non Private Practice Allow', 'Non Private Practice Allowance', 'NPP', 'Non Private Practice Allow (0128)'],
    codeAliases: ['0128'],
  },
  {
    componentCode: '0101',
    componentName: 'Special Additional Pay',
    shortName: 'Special Pay',
    type: 'EARNING',
    kind: 'COMPONENT',
    category: 'Allowance',
    displayOrder: 80,
    headerAliases: ['Special Additional Pay', 'Special Pay', 'Special Addl Pay', 'Special Additional Pay (0101)/(0102)', 'Special Addl Pay (0101)/(0102)'],
    codeAliases: ['0101', '0102'],
    notes: 'Shares the 0101/0102 code with Basic Pay; matched by name.',
  },
  {
    componentCode: '0132',
    componentName: 'Washing Allowance',
    shortName: 'Washing Allow',
    type: 'EARNING',
    kind: 'COMPONENT',
    category: 'Allowance',
    displayOrder: 90,
    headerAliases: ['Washing Allow', 'Washing Allowance', 'Washing', 'Washing Allow (0132)', 'Washing Allowance (0132)'],
    codeAliases: ['0132'],
  },
  {
    componentCode: 'GROSS',
    componentName: 'Gross Amount',
    shortName: 'Gross Amt',
    type: 'EARNING',
    kind: 'TOTAL',
    category: 'Total',
    displayOrder: 900,
    isTotalField: true,
    isSystemGenerated: true,
    headerAliases: ['Gross Amt', 'Gross Amount', 'Gross'],
    codeAliases: ['GROSS'],
  },
  {
    componentCode: '9510',
    componentName: 'Income Tax',
    shortName: 'IT',
    type: 'DEDUCTION',
    kind: 'COMPONENT',
    category: 'Tax',
    displayOrder: 10,
    isMandatory: true,
    headerAliases: ['Income Tax', 'IT', 'Income Tax (9510)'],
    codeAliases: ['9510'],
  },
  {
    componentCode: '9570',
    componentName: 'Professional Tax',
    shortName: 'Prof Tax',
    type: 'DEDUCTION',
    kind: 'COMPONENT',
    category: 'Tax',
    displayOrder: 20,
    isMandatory: true,
    headerAliases: ['Prof Tax', 'Professional Tax', 'PT', 'Prof Tax (9570)'],
    codeAliases: ['9570'],
  },
  {
    componentCode: '9591',
    componentName: 'HBA Interest',
    shortName: 'HBA',
    type: 'DEDUCTION',
    kind: 'COMPONENT',
    category: 'Loan',
    displayOrder: 30,
    headerAliases: ['HBA Interest', 'HBA', 'HBA Interest (9591)'],
    codeAliases: ['9591'],
  },
  {
    componentCode: '9670',
    componentName: 'GPF Regular',
    shortName: 'GPF Reg',
    type: 'DEDUCTION',
    kind: 'COMPONENT',
    category: 'Fund',
    displayOrder: 40,
    headerAliases: ['GPF Reg', 'GPF Regular', 'GPF', 'GPF Regular (9670)'],
    codeAliases: ['9670'],
  },
  {
    componentCode: '9531',
    componentName: 'GPF Regular Class 4',
    shortName: 'GPF Class 4',
    type: 'DEDUCTION',
    kind: 'COMPONENT',
    category: 'Fund',
    displayOrder: 50,
    headerAliases: ['GPF Reg Class 4', 'GPF Regular Class 4', 'GPF Class 4', 'GPF Class 4 (9531)'],
    codeAliases: ['9531'],
  },
  {
    componentCode: '9534',
    componentName: 'NPS Regular',
    shortName: 'NPS Reg',
    type: 'DEDUCTION',
    kind: 'COMPONENT',
    category: 'Fund',
    displayOrder: 60,
    headerAliases: ['NPS Reg', 'NPS Regular', 'NPS', 'NPS Regular (9534)'],
    codeAliases: ['9534'],
  },
  {
    componentCode: '9581',
    componentName: 'Govt Fund',
    shortName: 'Govt Fund',
    type: 'DEDUCTION',
    kind: 'COMPONENT',
    category: 'GIS',
    displayOrder: 70,
    headerAliases: ['Govt Fund', 'GIS Govt Fund', 'Govt Fund (9581)'],
    codeAliases: ['9581'],
  },
  {
    componentCode: '9582',
    componentName: 'Govt Saving',
    shortName: 'Govt Saving',
    type: 'DEDUCTION',
    kind: 'COMPONENT',
    category: 'GIS',
    displayOrder: 80,
    headerAliases: ['Govt Saving', 'GIS Govt Saving', 'Govt Saving (9582)'],
    codeAliases: ['9582'],
  },
  {
    componentCode: 'TOTDED',
    componentName: 'Total Deductions',
    shortName: 'Total Ded',
    type: 'DEDUCTION',
    kind: 'TOTAL',
    category: 'Total',
    displayOrder: 900,
    isTotalField: true,
    isSystemGenerated: true,
    headerAliases: ['Total Ded', 'Total Deductions', 'Total Deduction'],
    codeAliases: ['TOTDED'],
  },
  {
    componentCode: 'NETPAY',
    componentName: 'Net Pay',
    shortName: 'Net Pay',
    type: 'DEDUCTION',
    kind: 'NET_PAY',
    category: 'Total',
    displayOrder: 910,
    isTotalField: true,
    isSystemGenerated: true,
    headerAliases: ['Net Pay'],
    codeAliases: ['NETPAY'],
  },
];

export function buildDefaultComponents(): PayrollComponent[] {
  const now = new Date().toISOString();
  return DEFAULT_COMPONENT_SEED.map((seed, idx) => ({
    id: `seed-${idx + 1}`,
    componentCode: seed.componentCode,
    componentName: seed.componentName,
    shortName: seed.shortName ?? null,
    type: seed.type,
    kind: seed.kind,
    category: seed.category ?? null,
    subCategory: null,
    active: true,
    displayOrder: seed.displayOrder,
    pdfHeaderAliases: [...seed.headerAliases],
    pdfCodeAliases: [...seed.codeAliases],
    isMandatory: Boolean(seed.isMandatory),
    isTotalField: Boolean(seed.isTotalField),
    isSystemGenerated: Boolean(seed.isSystemGenerated),
    validationRule: null,
    notes: seed.notes ?? null,
    createdAt: now,
    updatedAt: now,
  }));
}

/**
 * ---------------------------------------------------------------------------
 * Matching engine
 *
 * Priority (per spec):
 *   1. Exact component code match
 *   2. Exact component name match
 *   3. Exact alias match
 *   4. Normalized text match
 *   5. Fuzzy/approximate match
 *   6. Unknown component
 * ---------------------------------------------------------------------------
 */
export class ComponentMasterMatcher {
  private components: PayrollComponent[];

  constructor(components: PayrollComponent[]) {
    this.components = components;
  }

  getComponents(): PayrollComponent[] {
    return this.components;
  }

  /** All active components that represent normal earning/deduction columns (not totals). */
  getRegularComponents(type?: PayrollComponentType): PayrollComponent[] {
    return this.components
      .filter((c) => c.active && c.kind === 'COMPONENT')
      .filter((c) => !type || c.type === type)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }

  findComponent(fragment: string): ComponentMatchResult {
    const raw = fragment.trim();
    if (!raw) {
      return { detectedText: raw, matchMethod: 'UNKNOWN', confidence: 0 };
    }

    const activeComps = this.components.filter((c) => c.active);
    const detectedCode = extractFirstCode(raw);

    // 1. Exact code match (highest confidence)
    if (detectedCode) {
      const byCode = activeComps.filter((c) => this.componentHasCode(c, detectedCode));
      if (byCode.length > 0) {
        const byNameInText = byCode.filter((c) => this.matchesInText(raw, c));
        const winner =
          byNameInText.length === 1
            ? byNameInText[0]
            : [...(byNameInText.length > 1 ? byNameInText : byCode)].sort(
                (a, b) => a.displayOrder - b.displayOrder
              )[0];
        return {
          detectedText: raw,
          detectedCode,
          component: winner,
          matchedComponentId: winner.id,
          matchMethod: 'CODE',
          confidence: 1,
        };
      }
    }

    const norm = normalizeForMatch(stripParentheticalCodes(raw));

    // 2-5. name / alias / normalized / fuzzy
    let best: ComponentMatchResult | null = null;
    for (const comp of activeComps) {
      const r = this.matchAgainst(comp, norm);
      if (r && (!best || r.confidence > best.confidence)) best = r;
    }
    if (best) return best;

    // 6. Unknown
    return {
      detectedText: raw,
      detectedCode,
      matchMethod: 'UNKNOWN',
      confidence: 0,
    };
  }

  private matchAgainst(comp: PayrollComponent, norm: string): ComponentMatchResult | null {
    const nameNorm = normalizeForMatch(comp.componentName);
    const aliasNorms = comp.pdfHeaderAliases.map(normalizeForMatch).filter(Boolean);
    const shortNorm = comp.shortName ? normalizeForMatch(comp.shortName) : null;

    // 2. Exact name match
    if (nameNorm && norm === nameNorm) {
      return this.result(comp, 'NAME', 0.98);
    }

    // 3. Exact alias match
    for (const a of aliasNorms) {
      if (a && norm === a) return this.result(comp, 'ALIAS', 0.95);
    }

    // Loose matching (NORMALIZED / FUZZY) is unreliable for very short tokens
    // (e.g. "P", "No", "1", "PH") — those should only ever match exactly.
    if (norm.length < 3) return null;

    // 4. Normalized text match (contains either way)
    if (nameNorm && (norm.includes(nameNorm) || nameNorm.includes(norm))) {
      return this.result(comp, 'NORMALIZED', 0.85);
    }
    for (const a of aliasNorms) {
      if (a && (norm.includes(a) || a.includes(norm))) {
        return this.result(comp, 'NORMALIZED', 0.85);
      }
    }
    if (shortNorm && (norm.includes(shortNorm) || shortNorm.includes(norm))) {
      return this.result(comp, 'NORMALIZED', 0.8);
    }

    // 5. Fuzzy match (weak — only used when nothing stronger matched)
    if (nameNorm && isFuzzyMatch(norm, nameNorm)) {
      return this.result(comp, 'FUZZY', 0.7);
    }
    for (const a of aliasNorms) {
      if (a && isFuzzyMatch(norm, a)) return this.result(comp, 'FUZZY', 0.7);
    }

    return null;
  }

  private result(
    comp: PayrollComponent,
    matchMethod: ComponentMatchMethod,
    confidence: number
  ): ComponentMatchResult {
    return {
      detectedText: comp.componentName,
      component: comp,
      matchedComponentId: comp.id,
      matchMethod,
      confidence,
    };
  }

  private componentHasCode(comp: PayrollComponent, code: string): boolean {
    if (comp.componentCode && comp.componentCode === code) return true;
    return comp.pdfCodeAliases.includes(code);
  }

  private matchesInText(raw: string, comp: PayrollComponent): boolean {
    const candidates = [comp.componentName, comp.shortName, ...comp.pdfHeaderAliases].filter(
      Boolean
    ) as string[];
    for (const cand of candidates) {
      if (new RegExp(`\\b${escapeRegExp(cand)}\\b`, 'i').test(raw)) return true;
    }
    return false;
  }
}

/**
 * ---------------------------------------------------------------------------
 * Repository (database-backed CRUD with graceful offline fallback)
 * ---------------------------------------------------------------------------
 */

export interface ComponentMasterInput {
  componentCode: string | null;
  componentName: string;
  shortName?: string | null;
  type: PayrollComponentType;
  kind: PayrollComponentKind;
  category?: string | null;
  subCategory?: string | null;
  active: boolean;
  displayOrder: number;
  pdfHeaderAliases: string[];
  pdfCodeAliases: string[];
  isMandatory?: boolean;
  isTotalField?: boolean;
  isSystemGenerated?: boolean;
  validationRule?: PayrollComponentValidationRule | null;
  notes?: string | null;
}

function rowToComponent(
  row: Record<string, unknown>,
  aliases: PayrollComponentAlias[]
): PayrollComponent {
  const headerAliases = aliases
    .filter((a) => a.aliasType === 'HEADER')
    .map((a) => a.aliasText);
  const codeAliases = aliases
    .filter((a) => a.aliasType === 'CODE')
    .map((a) => a.aliasText);
  return {
    id: String(row.id),
    componentCode: (row.component_code as string | null) ?? null,
    componentName: row.component_name as string,
    shortName: (row.short_name as string | null) ?? null,
    type: row.type as PayrollComponentType,
    kind: (row.kind as PayrollComponentKind) || 'COMPONENT',
    category: (row.category as string | null) ?? null,
    subCategory: (row.sub_category as string | null) ?? null,
    active: Boolean(row.active),
    displayOrder: Number(row.display_order) || 0,
    pdfHeaderAliases: headerAliases,
    pdfCodeAliases: codeAliases,
    isMandatory: Boolean(row.is_mandatory),
    isTotalField: Boolean(row.is_total_field),
    isSystemGenerated: Boolean(row.is_system_generated),
    validationRule: (row.validation_rule as PayrollComponentValidationRule | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export class ComponentMasterRepository {
  /** Load every component together with its aliases from the database. */
  async listAll(): Promise<PayrollComponent[]> {
    try {
      const { data: comps, error } = await supabase
        .from('payroll_components')
        .select('*')
        .order('display_order', { ascending: true });

      // Auto-seed defaults if database is empty so new users get components automatically
      if (!error && Array.isArray(comps) && comps.length === 0) {
        return await this.seedDefaults();
      }

      if (error || !comps || comps.length === 0) return buildDefaultComponents();

      const { data: aliases } = await supabase
        .from('payroll_component_aliases')
        .select('*');

      const aliasMap = new Map<string, PayrollComponentAlias[]>();
      for (const a of aliases || []) {
        const list = aliasMap.get(String(a.component_id)) || [];
        list.push({
          id: String(a.id),
          componentId: String(a.component_id),
          aliasText: a.alias_text,
          aliasType: a.alias_type as PayrollComponentAlias['aliasType'],
          createdAt: a.created_at,
        });
        aliasMap.set(String(a.component_id), list);
      }

      return comps.map((r) => rowToComponent(r as Record<string, unknown>, aliasMap.get(String(r.id)) || []));
    } catch {
      return buildDefaultComponents();
    }
  }

  /**
   * Seed all standard government payroll components and aliases into the database.
   * If records already exist, existing custom records are preserved.
   */
  async seedDefaults(): Promise<PayrollComponent[]> {
    try {
      for (const seed of DEFAULT_COMPONENT_SEED) {
        const { data: existing } = await supabase
          .from('payroll_components')
          .select('id')
          .eq('component_name', seed.componentName)
          .eq('type', seed.type)
          .maybeSingle();

        let componentId = existing?.id;
        if (!componentId) {
          const { data: inserted, error } = await supabase
            .from('payroll_components')
            .insert({
              component_code: seed.componentCode,
              component_name: seed.componentName,
              short_name: seed.shortName ?? null,
              type: seed.type,
              kind: seed.kind,
              category: seed.category ?? null,
              sub_category: null,
              active: true,
              display_order: seed.displayOrder,
              is_mandatory: Boolean(seed.isMandatory),
              is_total_field: Boolean(seed.isTotalField),
              is_system_generated: Boolean(seed.isSystemGenerated),
              notes: seed.notes ?? null,
            })
            .select('id')
            .maybeSingle();

          if (error || !inserted) continue;
          componentId = inserted.id;
        }

        if (componentId) {
          const aliasesToInsert: Array<{ component_id: string; alias_text: string; alias_type: 'HEADER' | 'CODE' }> = [];
          for (const h of seed.headerAliases) {
            aliasesToInsert.push({ component_id: componentId, alias_text: h, alias_type: 'HEADER' });
          }
          for (const c of seed.codeAliases) {
            aliasesToInsert.push({ component_id: componentId, alias_text: c, alias_type: 'CODE' });
          }
          if (aliasesToInsert.length > 0) {
            await supabase.from('payroll_component_aliases').delete().eq('component_id', componentId);
            await supabase.from('payroll_component_aliases').insert(aliasesToInsert);
          }
        }
      }

      const { data: finalComps } = await supabase
        .from('payroll_components')
        .select('*')
        .order('display_order', { ascending: true });

      if (finalComps && finalComps.length > 0) {
        const { data: aliases } = await supabase
          .from('payroll_component_aliases')
          .select('*');

        const aliasMap = new Map<string, PayrollComponentAlias[]>();
        for (const a of aliases || []) {
          const list = aliasMap.get(String(a.component_id)) || [];
          list.push({
            id: String(a.id),
            componentId: String(a.component_id),
            aliasText: a.alias_text,
            aliasType: a.alias_type as PayrollComponentAlias['aliasType'],
            createdAt: a.created_at,
          });
          aliasMap.set(String(a.component_id), list);
        }

        return finalComps.map((r) => rowToComponent(r as Record<string, unknown>, aliasMap.get(String(r.id)) || []));
      }
      return buildDefaultComponents();
    } catch {
      return buildDefaultComponents();
    }
  }

  async create(input: ComponentMasterInput): Promise<PayrollComponent> {
    const { data, error } = await supabase
      .from('payroll_components')
      .insert({
        component_code: input.componentCode,
        component_name: input.componentName,
        short_name: input.shortName ?? null,
        type: input.type,
        kind: input.kind,
        category: input.category ?? null,
        sub_category: input.subCategory ?? null,
        active: input.active,
        display_order: input.displayOrder,
        is_mandatory: input.isMandatory ?? false,
        is_total_field: input.isTotalField ?? input.kind !== 'COMPONENT',
        is_system_generated: input.isSystemGenerated ?? false,
        validation_rule: (input.validationRule as unknown as Record<string, unknown> | null) ?? null,
        notes: input.notes ?? null,
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Could not create component.');

    const component = rowToComponent(data as Record<string, unknown>, []);
    await this.replaceAliases(component.id, input);
    return this.listAll().then((all) => all.find((c) => c.id === component.id) || component);
  }

  async update(id: string, input: ComponentMasterInput): Promise<PayrollComponent> {
    const { data, error } = await supabase
      .from('payroll_components')
      .update({
        component_code: input.componentCode,
        component_name: input.componentName,
        short_name: input.shortName ?? null,
        type: input.type,
        kind: input.kind,
        category: input.category ?? null,
        sub_category: input.subCategory ?? null,
        active: input.active,
        display_order: input.displayOrder,
        is_mandatory: input.isMandatory ?? false,
        is_total_field: input.isTotalField ?? input.kind !== 'COMPONENT',
        is_system_generated: input.isSystemGenerated ?? false,
        validation_rule: (input.validationRule as unknown as Record<string, unknown> | null) ?? null,
        notes: input.notes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Could not update component.');

    await this.replaceAliases(id, input);
    return this.listAll().then((all) => all.find((c) => c.id === id) || rowToComponent(data as Record<string, unknown>, []));
  }

  async setActive(id: string, active: boolean): Promise<void> {
    const { error } = await supabase
      .from('payroll_components')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  /** Returns true when the component is referenced by historical payroll data. */
  async isReferenced(id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('paybill_employee_components')
      .select('id')
      .eq('component_id', id)
      .limit(1);
    if (error) return false;
    return Boolean(data && data.length > 0);
  }

  /**
   * Hard delete only when the component is not referenced by historical data.
   * Referenced components must be deactivated instead (soft delete).
   */
  async remove(id: string): Promise<{ deleted: boolean; reason?: string }> {
    const referenced = await this.isReferenced(id);
    if (referenced) {
      return {
        deleted: false,
        reason:
          'This component is referenced by historical payroll data. Deactivate it instead of deleting.',
      };
    }
    const { error } = await supabase.from('payroll_components').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { deleted: true };
  }

  private async replaceAliases(id: string, input: ComponentMasterInput): Promise<void> {
    await supabase.from('payroll_component_aliases').delete().eq('component_id', id);
    const aliases: Array<{ component_id: string; alias_text: string; alias_type: 'HEADER' | 'CODE' }> =
      [];
    for (const a of input.pdfHeaderAliases || []) {
      if (a.trim()) aliases.push({ component_id: id, alias_text: a.trim(), alias_type: 'HEADER' });
    }
    for (const a of input.pdfCodeAliases || []) {
      if (a.trim()) aliases.push({ component_id: id, alias_text: a.trim(), alias_type: 'CODE' });
    }
    if (aliases.length > 0) {
      await supabase.from('payroll_component_aliases').insert(aliases);
    }
  }
}

/**
 * ---------------------------------------------------------------------------
 * Singleton facade used by the parser, import flow and the Component Master UI
 * ---------------------------------------------------------------------------
 */
class ComponentMasterService {
  private cache: PayrollComponent[] | null = null;

  constructor() {
    this.cache = buildDefaultComponents();
  }

  /** Synchronous matcher based on the current cached master (defaults until refreshed). */
  getMatcher(): ComponentMasterMatcher {
    return new ComponentMasterMatcher(this.cache || buildDefaultComponents());
  }

  /** Current cached component list (no DB round-trip). */
  getCachedComponents(): PayrollComponent[] {
    return this.cache || buildDefaultComponents();
  }

  /** Refresh the in-memory master from the database (falls back to defaults). */
  async refresh(): Promise<PayrollComponent[]> {
    try {
      this.cache = await new ComponentMasterRepository().listAll();
    } catch {
      this.cache = buildDefaultComponents();
    }
    return this.cache;
  }

  /** Seed or re-seed all standard default components into the database. */
  async seedDefaults(): Promise<PayrollComponent[]> {
    try {
      this.cache = await new ComponentMasterRepository().seedDefaults();
    } catch {
      this.cache = buildDefaultComponents();
    }
    return this.cache;
  }

  /** Query components with optional filters, ordered by display_order. */
  async listComponents(filters?: {
    search?: string;
    type?: PayrollComponentType | 'ALL';
    category?: string;
    active?: boolean | 'ALL';
  }): Promise<PayrollComponent[]> {
    let list = await this.refresh();
    if (filters?.type && filters.type !== 'ALL') {
      list = list.filter((c) => c.type === filters.type);
    }
    if (filters?.category && filters.category !== 'ALL') {
      list = list.filter((c) => c.category === filters.category);
    }
    if (filters?.active !== undefined && filters.active !== 'ALL') {
      list = list.filter((c) => c.active === filters.active);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          (c.componentCode || '').toLowerCase().includes(q) ||
          c.componentName.toLowerCase().includes(q) ||
          (c.shortName || '').toLowerCase().includes(q) ||
          c.pdfHeaderAliases.some((a) => a.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  async getCategories(): Promise<string[]> {
    const list = await this.refresh();
    return Array.from(new Set(list.map((c) => c.category).filter(Boolean) as string[])).sort();
  }

  getRepository(): ComponentMasterRepository {
    return new ComponentMasterRepository();
  }

  /** Detect PDF header components for a sheet, ordered left-to-right. */
  detectHeaderComponents(
    rawText: string,
    sheetType: PayrollComponentType
  ): DetectedComponentInfo[] {
    return this.getMatcher().getComponents().length >= 0
      ? new ComponentHeaderDetector(this.getMatcher()).detect(rawText, sheetType)
      : [];
  }
}

/**
 * Detects component columns present in a pay bill PDF table header.
 * Known components are matched by name/alias/code; unknown coded headers are
 * surfaced as UNKNOWN detections so users can add them to the master.
 */
class ComponentHeaderDetector {
  constructor(private matcher: ComponentMasterMatcher) {}

  detect(rawText: string, sheetType: PayrollComponentType): DetectedComponentInfo[] {
    const headerBlock = this.extractTableHeaderBlock(rawText);
    if (!headerBlock) return [];

    const found: Array<{ info: DetectedComponentInfo; index: number }> = [];
    const usedCodes = new Set<string>();

    const relevant = this.matcher
      .getComponents()
      .filter((c) => c.active)
      .filter((c) => c.kind === 'COMPONENT' ? c.type === sheetType : true);

    for (const comp of relevant) {
      const occ = this.findOccurrence(headerBlock, comp);
      if (occ.index < 0) continue;
      if (comp.componentCode) usedCodes.add(comp.componentCode);
      for (const code of comp.pdfCodeAliases) usedCodes.add(code);

      const isTotal = comp.kind !== 'COMPONENT';
      found.push({
        index: occ.index,
        info: {
          componentId: comp.id,
          componentCode: comp.componentCode,
          componentName: comp.componentName,
          shortName: comp.shortName,
          type: isTotal ? (comp.kind === 'NET_PAY' ? 'NET_PAY' : 'TOTAL') : comp.type,
          kind: comp.kind,
          detectedText: occ.text,
          detectedCode: comp.componentCode || undefined,
          matchMethod: occ.method,
          confidence: occ.method === 'CODE' ? 1 : occ.method === 'NAME' ? 0.98 : occ.method === 'ALIAS' ? 0.95 : 0.85,
          order: 0,
          isTotalField: comp.isTotalField || isTotal,
        },
      });
    }

    // Unknown coded headers -> "New payroll component detected"
    const codeRegex = /\((\d{3,4})\)/g;
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    while ((m = codeRegex.exec(headerBlock)) !== null) {
      const code = m[1];
      if (seen.has(code)) continue;
      seen.add(code);
      if (usedCodes.has(code)) continue;

      const before = headerBlock.slice(Math.max(0, m.index - 80), m.index);
      const fragment =
        before
          .split(/[\n\r]+/)
          .pop()
          ?.replace(/\((\d{3,4})\)/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim() || `Component ${code}`;

      found.push({
        index: m.index,
        info: {
          componentCode: code,
          componentName: fragment || `Component ${code}`,
          type: sheetType,
          kind: 'COMPONENT',
          detectedText: fragment || `Component ${code}`,
          detectedCode: code,
          matchMethod: 'UNKNOWN',
          confidence: 0,
          order: 0,
          isTotalField: false,
        },
      });
    }

    found.sort((a, b) => a.index - b.index);
    return found.map((f, i) => ({ ...f.info, order: i }));
  }

  private extractTableHeaderBlock(rawText: string): string {
    const lines = rawText.split(/\r?\n/).map((l) => l.trim());
    const startIdx = lines.findIndex((l) => /\bHRPN\b/.test(l) || /^Sr\s*$/i.test(l));
    if (startIdx < 0) return '';
    const endIdx = lines.findIndex(
      (l, i) =>
        i > startIdx &&
        (/\.\d{2}\b/.test(l) || /^\d{1,4}\s+\d{7,10}\b/.test(l) || /^\d{7,10}\b/.test(l))
    );
    return lines.slice(startIdx, endIdx < 0 ? undefined : endIdx).join('\n');
  }

  private findOccurrence(
    header: string,
    comp: PayrollComponent
  ): { index: number; method: ComponentMatchMethod; text: string } {
    const candidates = [comp.componentName, comp.shortName, ...comp.pdfHeaderAliases].filter(
      Boolean
    ) as string[];
    const unique = Array.from(new Set(candidates)).sort((a, b) => b.length - a.length);

    for (const cand of unique) {
      const idx = header.search(new RegExp(`\\b${escapeRegExp(cand)}\\b`, 'i'));
      if (idx >= 0) {
        const method: ComponentMatchMethod =
          cand === comp.componentName ? 'NAME' : 'ALIAS';
        return { index: idx, method, text: cand };
      }
    }

    const nameNorm = normalizeForMatch(comp.componentName);
    if (nameNorm && normalizeForMatch(header).includes(nameNorm)) {
      const idx = header.toLowerCase().indexOf(comp.componentName.toLowerCase());
      return { index: idx >= 0 ? idx : 0, method: 'NORMALIZED', text: comp.componentName };
    }

    const codes = [comp.componentCode, ...comp.pdfCodeAliases].filter(Boolean) as string[];
    for (const code of codes) {
      const idx = header.search(new RegExp(`\\b${escapeRegExp(code)}\\b`));
      if (idx >= 0) return { index: idx, method: 'CODE', text: code };
    }

    return { index: -1, method: 'UNKNOWN', text: '' };
  }
}

export const componentMasterService = new ComponentMasterService();
export { ComponentHeaderDetector };