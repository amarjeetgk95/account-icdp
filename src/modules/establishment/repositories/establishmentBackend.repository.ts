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

    const { data, error } = await supabase.rpc('list_establishment', {
      p_office_id: officeId,
    });
    if (error) {
      console.warn('[EstablishmentBackend] list_establishment failed:', error);
      throw new Error(error.message);
    }

    const result = establishmentListDbSchema.safeParse(this.assertRpcArray(data, 'register'));
    if (!result.success) {
      console.warn('[EstablishmentBackend] employee list validation failed:', result.error.flatten());
      throw new Error('Establishment register returned invalid data');
    }
    return result.data;
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
