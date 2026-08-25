import type { EstablishmentEmployee, EstablishmentPost, EstablishmentState } from '../types';
import { establishmentBackendRepository } from '../repositories/establishmentBackend.repository';
import { establishmentLocalRepository } from '../repositories/establishmentLocal.repository';

class EstablishmentService {
  loadState(): EstablishmentState {
    return establishmentLocalRepository.loadState();
  }

  loadEmployees(): EstablishmentEmployee[] {
    return this.loadState().employees;
  }

  loadPosts(): EstablishmentPost[] {
    return this.loadState().posts;
  }

  /**
   * Backend-first refresh used as the react-query queryFn. Fetches the
   * register from the server, persists it locally, and always resolves with
   * a usable list (local fallback when the backend is unavailable).
   */
  async syncEmployees(): Promise<EstablishmentEmployee[]> {
    try {
      const employees = await establishmentBackendRepository.listEmployees();
      if (employees) {
        establishmentLocalRepository.saveEmployees(employees);
        establishmentLocalRepository.saveStatePatch({ lastSyncedAt: new Date().toISOString() });
      }
    } catch (error) {
      console.warn('[Establishment] syncEmployees fell back to local cache:', error);
    }
    return this.loadState().employees;
  }

  async syncPosts(): Promise<EstablishmentPost[]> {
    try {
      const posts = await establishmentBackendRepository.listPosts();
      if (posts) {
        establishmentLocalRepository.savePosts(posts);
      }
    } catch (error) {
      console.warn('[Establishment] syncPosts fell back to local cache:', error);
    }
    return this.loadState().posts;
  }

  async hydrateFromBackend(): Promise<EstablishmentState> {
    const [employees, posts] = await Promise.all([
      establishmentBackendRepository.listEmployees(),
      establishmentBackendRepository.listPosts(),
    ]);

    if (employees === null && posts === null) {
      return this.loadState();
    }

    const next: EstablishmentState = {
      employees: employees ?? this.loadState().employees,
      posts: posts ?? this.loadState().posts,
      lastSyncedAt: new Date().toISOString(),
    };

    if (employees !== null) {
      establishmentLocalRepository.saveEmployees(next.employees);
    }
    if (posts !== null) {
      establishmentLocalRepository.savePosts(next.posts);
    }
    return next;
  }

  async saveEmployees(employees: EstablishmentEmployee[]): Promise<EstablishmentState> {
    const backend = await establishmentBackendRepository.replaceEmployees(employees);
    if (backend) {
      const state = establishmentLocalRepository.saveEmployees(backend);
      return { ...state, posts: this.loadState().posts };
    }
    return establishmentLocalRepository.saveEmployees(employees);
  }

  async savePosts(posts: EstablishmentPost[]): Promise<EstablishmentState> {
    const backend = await establishmentBackendRepository.replacePosts(posts);
    if (backend) {
      const state = establishmentLocalRepository.savePosts(backend);
      return { ...state, employees: this.loadState().employees };
    }
    return establishmentLocalRepository.savePosts(posts);
  }
}

export const establishmentService = new EstablishmentService();
