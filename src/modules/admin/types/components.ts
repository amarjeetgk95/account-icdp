import type {
  PayrollComponentKind,
  PayrollComponentType,
  PayrollComponentValidationRule,
} from '@/modules/paybill/types/componentMaster';

interface AdminComponentAlias {
  id: string;
  alias_text: string;
  alias_type: 'HEADER' | 'CODE';
  created_at: string;
}

export interface AdminComponent {
  id: string;
  component_code: string | null;
  component_name: string;
  short_name: string | null;
  type: PayrollComponentType;
  kind: PayrollComponentKind;
  category: string | null;
  sub_category: string | null;
  active: boolean;
  display_order: number;
  is_mandatory: boolean;
  is_total_field: boolean;
  is_system_generated: boolean;
  validation_rule: PayrollComponentValidationRule | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  aliases: AdminComponentAlias[];
}

export interface AdminComponentInput {
  id?: string | null;
  component_code: string | null;
  component_name: string;
  short_name: string | null;
  type: PayrollComponentType;
  kind: PayrollComponentKind;
  category: string | null;
  sub_category: string | null;
  active: boolean;
  display_order: number;
  is_mandatory: boolean;
  is_total_field: boolean;
  is_system_generated: boolean;
  validation_rule: PayrollComponentValidationRule | null;
  notes: string | null;
  aliases: Array<{ alias_text: string; alias_type: 'HEADER' | 'CODE' }>;
}
