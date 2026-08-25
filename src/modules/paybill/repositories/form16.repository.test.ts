import { describe, it, expect, beforeEach, vi } from 'vitest';
import { form16Repository } from './form16.repository';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('@/shared/utilities/office', () => ({
  getOfficeScope: vi.fn(() => ({ all: false, officeId: '101' })),
  requireOfficeId: vi.fn(() => '101'),
}));

describe('form16Repository', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('generates new draft defaults with expected structure', () => {
    const draft = form16Repository.newDraftDefaults(2025, 'HRPN12345');
    expect(draft.financialYear).toBe(2025);
    expect(draft.assessmentYear).toBe(2026);
    expect(draft.hrpn).toBe('HRPN12345');
    expect(draft.status).toBe('DRAFT');
    expect(draft.taxRegime).toBe('NEW');
    expect(draft.partA.quarters).toHaveLength(4);
    expect(draft.employee.pan).toBe('');
  });

  it('saves draft to local storage fallback and retrieves it', async () => {
    const draft = form16Repository.newDraftDefaults(2025, 'HRPN99999');
    draft.employee.pan = 'ABCDE1234F';
    draft.employee.name = 'Test Employee';

    const saved = await form16Repository.saveDraft(draft);
    expect(saved).toBeDefined();
    expect(saved.hrpn).toBe('HRPN99999');
    expect(saved.employee.pan).toBe('ABCDE1234F');

    const fetched = await form16Repository.getCertificate(2025, 'HRPN99999');
    expect(fetched).toBeDefined();
    expect(fetched?.employee.pan).toBe('ABCDE1234F');
    expect(fetched?.employee.name).toBe('Test Employee');
  });

  it('lists certificates including local cache drafts', async () => {
    const draft1 = form16Repository.newDraftDefaults(2025, 'HRPN001');
    const draft2 = form16Repository.newDraftDefaults(2025, 'HRPN002');
    await form16Repository.saveDraft(draft1);
    await form16Repository.saveDraft(draft2);

    const list = await form16Repository.listCertificates(2025);
    expect(list.length).toBeGreaterThanOrEqual(2);
    const hrpns = list.map((c) => c.hrpn);
    expect(hrpns).toContain('HRPN001');
    expect(hrpns).toContain('HRPN002');
  });

  it('updates status and keeps local cache synchronized', async () => {
    const draft = form16Repository.newDraftDefaults(2025, 'HRPN777');
    const saved = await form16Repository.saveDraft(draft);

    await form16Repository.updateStatus(saved.id, 'REVIEWED');
    const updated = await form16Repository.getCertificateById(saved.id);
    expect(updated?.status).toBe('REVIEWED');

    await form16Repository.updateStatus(saved.id, 'ISSUED');
    const issued = await form16Repository.getCertificateById(saved.id);
    expect(issued?.status).toBe('ISSUED');
    expect(issued?.issuedAt).toBeDefined();
  });

  it('handles batch save and batch status updates', async () => {
    const draft1 = form16Repository.newDraftDefaults(2025, 'HRPN_B1');
    const draft2 = form16Repository.newDraftDefaults(2025, 'HRPN_B2');
    const savedList = await form16Repository.batchSaveDrafts([draft1, draft2]);
    expect(savedList).toHaveLength(2);

    const ids = savedList.map((s) => s.id);
    await form16Repository.batchUpdateStatus(ids, 'REVIEWED');
    const updated1 = await form16Repository.getCertificateById(ids[0]);
    const updated2 = await form16Repository.getCertificateById(ids[1]);
    expect(updated1?.status).toBe('REVIEWED');
    expect(updated2?.status).toBe('REVIEWED');
  });

  it('saves and retrieves 24Q quarterly office settings', async () => {
    const s = await form16Repository.get24QSettings(2025);
    expect(s.financialYear).toBe(2025);
    expect(s.quarters.Q1.receiptNumber).toBe('');

    await form16Repository.save24QSettings({
      financialYear: 2025,
      quarters: {
        Q1: { receiptNumber: 'Q1REC123', filingDate: '15-Jul-2025' },
        Q2: { receiptNumber: 'Q2REC456', filingDate: '15-Oct-2025' },
        Q3: { receiptNumber: 'Q3REC789', filingDate: '15-Jan-2026' },
        Q4: { receiptNumber: 'Q4REC000', filingDate: '15-May-2026' },
      },
    });

    const draft = form16Repository.newDraftDefaults(2025, 'HRPN_Q24');
    await form16Repository.saveDraft(draft);

    const updatedCount = await form16Repository.apply24QToAllCertificates(2025, {
      financialYear: 2025,
      quarters: {
        Q1: { receiptNumber: 'Q1REC123', filingDate: '15-Jul-2025' },
        Q2: { receiptNumber: 'Q2REC456', filingDate: '15-Oct-2025' },
        Q3: { receiptNumber: 'Q3REC789', filingDate: '15-Jan-2026' },
        Q4: { receiptNumber: 'Q4REC000', filingDate: '15-May-2026' },
      },
    });
    expect(updatedCount).toBeGreaterThanOrEqual(1);

    const cert = await form16Repository.getCertificate(2025, 'HRPN_Q24');
    expect(cert?.partA.quarters.find((q) => q.quarter === 'Q1')?.receiptNumber).toBe('Q1REC123');
  });

  it('saves and retrieves dynamic Tax Rules and Slabs configuration', async () => {
    const initial = await form16Repository.getTaxRulesSettings();
    expect(initial.assessmentYears).toBeDefined();
    expect(initial.assessmentYears['2026-27']?.standardDeduction).toBe(75000);

    await form16Repository.saveTaxRulesSettings({
      assessmentYears: {
        ...initial.assessmentYears,
        '2029-30': {
          ay: '2029-30',
          standardDeduction: 120000,
          basicExemption: 600000,
          rebate87ALimit: 1800000,
          rebate87AMaxAmount: 90000,
          cessRate: 4,
          slabs: [
            { id: 's1', upto: 600000, rate: 0 },
            { id: 's2', upto: Infinity, rate: 20 },
          ],
          surchargeThresholds: [],
        },
      },
    });

    const refreshed = await form16Repository.getTaxRulesSettings();
    expect(refreshed.assessmentYears['2029-30']).toBeDefined();
    expect(refreshed.assessmentYears['2029-30'].standardDeduction).toBe(120000);
  });
});

