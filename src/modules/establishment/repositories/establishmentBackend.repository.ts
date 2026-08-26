import { supabase } from '@/core/supabase/client';
import type { Json } from '@/shared/json.types';
import type { EstablishmentEmployee, EstablishmentPost } from '../types';
import { resolveEstablishmentOfficeId } from './officeScope';
import {
  establishmentListDbSchema,
  establishmentPostsDbSchema,
} from '../validation/establishment.schema';

class EstablishmentBackendRepository {
  /**
   * Supabase RPCs return `{ error: '...' }` JSON objects on authorization
   * failures (they are not HTTP errors), so inspect payloads explicitly and
   * surface a descriptive Error instead of failing silently.
   */
  private assertRpcArray(data: unknown, label: string): unknown[] {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const errText = (data as { error?: unknown }).error;
      if (errText) throw new Error(`Establishment ${label}: ${String(errText)}`);
      throw new Error(`Establishment ${label}: unexpected response shape`);
    }
    if (!Array.isArray(data)) {
      throw new Error(`Establishment ${label}: unexpected response shape`);
    }
    return data;
  }

  async listEmployees(): Promise<EstablishmentEmployee[] | null> {
    const officeId = await resolveEstablishmentOfficeId();
    if (!officeId) return null;

    try {
      const { data, error } = await supabase.rpc('list_establishment', {
        p_office_id: officeId,
      });
      if (error) {
        throw new Error(error.message);
      }

      const result = establishmentListDbSchema.safeParse(this.assertRpcArray(data, 'register'));
      if (result.success) {
        return result.data;
      }
      console.warn('[EstablishmentBackend] employee list validation warning:', result.error.flatten());
    } catch (err) {
      console.warn('[EstablishmentBackend] list_establishment RPC failed, falling back to direct table query:', err);
    }

    // Direct table fallback
    try {
      const { data: rows, error: tblErr } = await supabase
        .from('establishment_employees')
        .select('*')
        .eq('office_id', officeId);

      if (tblErr) throw tblErr;
      const rowList = rows as unknown as Array<Record<string, unknown>> | null;
      if (rowList && rowList.length > 0) {
        return rowList.map((r) => ({
          id: String(r.id),
          hrpnNo: String(r.hrpn_no || ''),
          name: String(r.name || ''),
          designation: r.designation ? String(r.designation) : undefined,
          designationGu: r.designation_gu ? String(r.designation_gu) : undefined,
          cadreClass: r.cadre_class ? String(r.cadre_class) : undefined,
          pan: r.pan ? String(r.pan) : undefined,
          payScale: r.pay_scale ? String(r.pay_scale) : undefined,
          gradePay: r.grade_pay ? String(r.grade_pay) : undefined,
          payLevel: r.pay_level ? String(r.pay_level) : undefined,
          payCell: r.pay_cell ? String(r.pay_cell) : undefined,
          ppaNo: r.ppa_no ? String(r.ppa_no) : undefined,
          joinDate: r.join_date ? String(r.join_date) : undefined,
          transferDate: r.transfer_date ? String(r.transfer_date) : undefined,
          headquarter: r.headquarter ? String(r.headquarter) : undefined,
          budgetHeadId: r.budget_head_id ? String(r.budget_head_id) : undefined,
          active: Boolean(r.active ?? true),
          quartersAddress: r.quarters_address ? String(r.quarters_address) : undefined,
          gisGroup: r.gis_group ? String(r.gis_group) : undefined,
          allowances: (r.allowances as EstablishmentEmployee['allowances']) || {},
          deductions: (r.deductions as EstablishmentEmployee['deductions']) || {},
          payEntries: [],
        }));
      }
    } catch (tblFallbackErr) {
      console.warn('[EstablishmentBackend] direct table query fallback failed:', tblFallbackErr);
    }

    return null;
  }

  async replaceEmployees(employees: EstablishmentEmployee[]): Promise<EstablishmentEmployee[] | null> {
    const officeId = await resolveEstablishmentOfficeId();
    if (!officeId) return null;

    const { data, error } = await supabase.rpc('upsert_establishment_employees', {
      p_office_id: officeId,
      p_employees: employees as unknown as Json,
    });
    if (error) {
      console.warn('[EstablishmentBackend] upsert_establishment_employees failed:', error);
      throw new Error(error.message);
    }

    const result = establishmentListDbSchema.safeParse(this.assertRpcArray(data, 'register save'));
    if (!result.success) {
      console.warn('[EstablishmentBackend] employee upsert validation failed:', result.error.flatten());
      throw new Error('Establishment register save returned invalid data');
    }
    return result.data;
  }

  async listPosts(): Promise<EstablishmentPost[] | null> {
    const officeId = await resolveEstablishmentOfficeId();
    if (!officeId) return null;

    const { data, error } = await supabase.rpc('list_establishment_posts', {
      p_office_id: officeId,
    });
    if (error) {
      console.warn('[EstablishmentBackend] list_establishment_posts failed:', error);
      throw new Error(error.message);
    }

    const result = establishmentPostsDbSchema.safeParse(this.assertRpcArray(data, 'posts'));
    if (!result.success) {
      console.warn('[EstablishmentBackend] posts list validation failed:', result.error.flatten());
      throw new Error('Establishment posts returned invalid data');
    }
    return result.data;
  }

  async replacePosts(posts: EstablishmentPost[]): Promise<EstablishmentPost[] | null> {
    const officeId = await resolveEstablishmentOfficeId();
    if (!officeId) return null;

    const { data, error } = await supabase.rpc('upsert_establishment_posts', {
      p_office_id: officeId,
      p_posts: posts as unknown as Json,
    });
    if (error) {
      console.warn('[EstablishmentBackend] upsert_establishment_posts failed:', error);
      throw new Error(error.message);
    }

    const result = establishmentPostsDbSchema.safeParse(this.assertRpcArray(data, 'posts save'));
    if (!result.success) {
      console.warn('[EstablishmentBackend] posts upsert validation failed:', result.error.flatten());
      throw new Error('Establishment posts save returned invalid data');
    }
    return result.data;
  }
}

export const establishmentBackendRepository = new EstablishmentBackendRepository();
