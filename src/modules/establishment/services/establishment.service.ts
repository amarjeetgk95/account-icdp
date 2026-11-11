import type { EstablishmentEmployee, EstablishmentPayEntry, EstablishmentState } from '../types';
import { establishmentBackendRepository } from '../repositories/establishmentBackend.repository';
import { establishmentLocalRepository } from '../repositories/establishmentLocal.repository';
import {
  findDuplicateEstablishmentHrpns,
  isUsableEstablishmentHrpn,
  normalizeEstablishmentHrpn,
  validateEstablishmentHrpnInput,
} from '../validation/establishment.schema';

/** Normalize an employee's HRPN to its canonical (trimmed + upper-cased) form. */
export function withCanonicalHrpn(employee: EstablishmentEmployee): EstablishmentEmployee {
  const canonical = normalizeEstablishmentHrpn(employee.hrpnNo);
  if ((employee.hrpnNo ?? '') === canonical) return employee;
  return { ...employee, hrpnNo: canonical };
}

function assertValidHrpn(employee: EstablishmentEmployee): void {
  const err = validateEstablishmentHrpnInput(employee.hrpnNo);
  if (err) throw new Error(err);
}

/**
 * No duplication of HRPN No. is allowed — the register is keyed by HRPN.
 * Checks the candidate against every other employee (excluding itself by id).
 */
function assertNoDuplicateHrpn(
  candidate: EstablishmentEmployee,
  others: EstablishmentEmployee[]
): void {
  const key = normalizeEstablishmentHrpn(candidate.hrpnNo);
  if (!isUsableEstablishmentHrpn(key)) return;
  const clash = others.find(
    (e) => e.id !== candidate.id && normalizeEstablishmentHrpn(e.hrpnNo) === key
  );
  if (clash) {
    throw new Error(
      `Duplicate HRPN No. "${key}" — already used by "${clash.name || 'another employee'}". HRPN No. must be unique.`
    );
  }
}

/**
 * The employee form does not edit dated pay history, so re-writing every pay
 * entry on each save is pure network waste. Compare against the cached copy.
 */
function payEntriesEqual(
  a: EstablishmentPayEntry[] | undefined,
  b: EstablishmentPayEntry[] | undefined
): boolean {
  const left = a ?? [];
  const right = b ?? [];
  if (left.length !== right.length) return false;
  const byId = new Map(left.map((entry) => [entry.id, entry]));
  return right.every((entry) => {
    const other = byId.get(entry.id);
    if (!other) return false;
    return (
      (other.effectiveDate ?? '') === (entry.effectiveDate ?? '') &&
      Number(other.basicPay ?? 0) === Number(entry.basicPay ?? 0) &&
      (other.payScale ?? '') === (entry.payScale ?? '') &&
      (other.levelCell ?? '') === (entry.levelCell ?? '') &&
      (other.notes ?? '') === (entry.notes ?? '')
    );
  });
}

class EstablishmentService {
  loadState(): EstablishmentState {
    return establishmentLocalRepository.loadState();
  }

  loadEmployees(): EstablishmentEmployee[] {
    return this.loadState().employees;
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

  async hydrateFromBackend(): Promise<EstablishmentState> {
    const employees = await establishmentBackendRepository.listEmployees();
    if (employees === null) {
      return this.loadState();
    }

    const next: EstablishmentState = {
      employees,
      lastSyncedAt: new Date().toISOString(),
    };
    establishmentLocalRepository.saveEmployees(next.employees);
    return next;
  }

  async saveEmployee(employee: EstablishmentEmployee): Promise<EstablishmentEmployee> {
    let canonical = withCanonicalHrpn(employee);
    assertValidHrpn(canonical);
    const existing = this.loadEmployees();
    assertNoDuplicateHrpn(canonical, existing);
    // New rows without an explicit sequence go last (max + 1) so the manual
    // order stays stable instead of collapsing to NULL.
    if (canonical.displayOrder === null || canonical.displayOrder === undefined) {
      const max = existing.reduce(
        (m, e) => (typeof e.displayOrder === 'number' && Number.isFinite(e.displayOrder) ? Math.max(m, Math.trunc(e.displayOrder)) : m),
        0
      );
      // Only assign when there is an established sequence; otherwise leave
      // NULL and let migration 062 backfill decide.
      if (max > 0 || existing.length > 0) {
        canonical = { ...canonical, displayOrder: max + 1 };
      }
    }
    const previous = existing.find((e) => e.id === canonical.id);
    const syncPayEntries = !previous || !payEntriesEqual(previous.payEntries, canonical.payEntries);
    try {
      const backend = await establishmentBackendRepository.saveEmployee(canonical, { syncPayEntries });
      const saved = backend ?? canonical;
      establishmentLocalRepository.saveEmployee(withCanonicalHrpn(saved));
      return withCanonicalHrpn(saved);
    } catch (error) {
      establishmentLocalRepository.saveEmployee(canonical);
      throw error;
    }
  }

  async deleteEmployee(id: string): Promise<void> {
    try {
      await establishmentBackendRepository.deleteEmployee(id);
    } finally {
      establishmentLocalRepository.deleteEmployee(id);
    }
  }

  async saveEmployees(employees: EstablishmentEmployee[]): Promise<EstablishmentState> {
    const canonical = employees.map(withCanonicalHrpn);
    for (const emp of canonical) assertValidHrpn(emp);
    const dups = findDuplicateEstablishmentHrpns(canonical);
    if (dups.length > 0) {
      throw new Error(
        `Duplicate HRPN No. not allowed: ${dups.join(', ')}. Each HRPN No. must be unique in the Establishment directory.`
      );
    }
    const backend = await establishmentBackendRepository.replaceEmployees(canonical);
    if (backend) {
      return establishmentLocalRepository.saveEmployees(backend);
    }
    return establishmentLocalRepository.saveEmployees(canonical);
  }

  /**
   * Persist manual directory sequence (1..N in orderedIds order).
   * Updates backend first, then mirrors the same sequence locally so
   * reports stay consistent even when offline.
   */
  async reorderEmployees(orderedIds: string[]): Promise<EstablishmentEmployee[]> {
    const current = this.loadEmployees();
    const byId = new Map(current.map((e) => [e.id, e]));
    const seen = new Set<string>();
    const next: EstablishmentEmployee[] = [];
    for (const id of orderedIds) {
      const emp = byId.get(id);
      if (emp && !seen.has(id)) {
        seen.add(id);
        next.push(emp);
      }
    }
    // Rows deleted elsewhere mid-session stay at the end, never dropped here.
    for (const emp of current) {
      if (!seen.has(emp.id)) next.push(emp);
    }
    const sequenced = next.map((emp, idx) => ({ ...emp, displayOrder: idx + 1 }));
    try {
      await establishmentBackendRepository.reorderEmployees(sequenced.map((e) => e.id));
    } catch (error) {
      // Backend missing column etc. still mirrors locally so the clerk's
      // arrangement is not lost; the error surfaces to the caller.
      establishmentLocalRepository.saveEmployees(sequenced);
      throw error;
    }
    establishmentLocalRepository.saveEmployees(sequenced);
    return sequenced;
  }
}

export const establishmentService = new EstablishmentService();
