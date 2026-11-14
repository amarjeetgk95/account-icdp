import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  fetchPositionsList,
  updatePositionRecord,
  fetchEmployeePostingHistory,
  relieveAndReassignPosition,
  syncEmployeePositionAssignment,
} from './positionBackend.repository';

vi.mock('@/core/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { supabase } from '@/core/supabase/client';

describe('positionBackendRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps the linked occupant identity and contact details', async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'pos-1',
          position_no: '102/05/01',
          designation_title: 'Senior Clerk',
          designation_title_gu: 'સિનિયર કારકુન',
          cadre_class: 'Class-3',
          pay_matrix_level: 'Level 5',
          budget_head_id: 7,
          status: 'FILLED',
          status_date: '2026-04-01',
          current_employee_id: 'emp-1',
          charge_employee_id: 'emp-2',
          headquarter: 'સેગવા',
          display_order: 1,
          resolution_note: null,
          resolution_pdf_url: null,
          remarks: null,
          current_employee: {
            id: 'emp-1',
            name: 'Ramesh Patel',
            name_gu: 'રમેશ પટેલ',
            hrpn_no: '100456',
            mobile_no: '9876543210',
          },
          charge_employee: {
            id: 'emp-2',
            name: 'Suresh Shah',
            name_gu: 'સુરેશ શાહ',
            hrpn_no: '100789',
            mobile_no: '9123456789',
          },
          budget_heads: { id: 7, code: 'BH-07', name: 'સામાન્ય' },
        },
      ],
      error: null,
    });
    const mockInnerOrder = vi.fn().mockReturnValue({ order: mockOrder });
    const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = vi.fn().mockReturnValue({ order: mockInnerOrder, limit: mockLimit });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const [record] = await fetchPositionsList();

    expect(record.currentEmployeeId).toBe('emp-1');
    expect(record.chargeEmployeeId).toBe('emp-2');
    expect(record.employeeName).toBe('રમેશ પટેલ');
    expect(record.hrpnNo).toBe('100456');
    expect(record.mobileNo).toBe('9876543210');
    expect(record.chargeNameGu).toBe('સુરેશ શાહ');
    expect(record.chargeMobileNo).toBe('9123456789');
    expect(record.headquarter).toBe('સેગવા');
    expect(record.budgetHeadId).toBe('7');
    expect(record.designationTitleEn).toBe('Senior Clerk');
    expect(record.designationTitleGu).toBe('સિનિયર કારકુન');
  });

  it('persists occupant links when updating a position', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
    } as unknown as ReturnType<typeof supabase.from>);

    await updatePositionRecord('pos-1', {
      designationTitleGu: 'સિનિયર કારકુન',
      headquarter: 'સેગવા',
      status: 'Filled',
      statusDate: '2026-04-01',
      currentEmployeeId: 'emp-1',
      chargeEmployeeId: null,
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        designation_title_gu: 'સિનિયર કારકુન',
        headquarter: 'સેગવા',
        status: 'FILLED',
        status_date: '2026-04-01',
        current_employee_id: 'emp-1',
        charge_employee_id: null,
      })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'pos-1');
  });

  it('persists the linked Government Resolution when updating a position', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = vi.fn().mockReturnValue({ limit: mockLimit });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    await updatePositionRecord('pos-1', { grId: 'gr-1' });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        gr_id: 'gr-1',
      })
    );
    expect(mockEq).toHaveBeenCalledWith('id', 'pos-1');
  });

  it('clears the linked Government Resolution when grId is null', async () => {
    const mockEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
    const mockLimit = vi.fn().mockResolvedValue({ data: [], error: null });
    const mockSelect = vi.fn().mockReturnValue({ limit: mockLimit });

    vi.mocked(supabase.from).mockReturnValue({
      update: mockUpdate,
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    await updatePositionRecord('pos-1', { grId: null });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        gr_id: null,
      })
    );
  });

  it('fetches employee posting history joined with position details', async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'hist-1',
          position_id: 'pos-1',
          employee_id: 'emp-1',
          assignment_type: 'REGULAR',
          start_date: '2022-04-01',
          end_date: '2024-06-15',
          order_no: 'EST/TR/2024/45',
          order_date: '2024-06-10',
          relieve_reason: 'TRANSFERRED',
          remarks: 'Transferred to Dahod',
          created_at: '2024-06-15T00:00:00Z',
          position: {
            id: 'pos-1',
            position_no: '02',
            designation_title_gu: 'સિનિયર કારકુન',
            cadre_class: 'Class-3',
            budget_heads: { id: 7, code: 'BH-07', name: 'સામાન્ય' },
          },
        },
      ],
      error: null,
    });
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

    vi.mocked(supabase.from).mockReturnValue({
      select: mockSelect,
    } as unknown as ReturnType<typeof supabase.from>);

    const history = await fetchEmployeePostingHistory('emp-1');

    expect(history.length).toBe(1);
    expect(history[0].positionNo).toBe('02');
    expect(history[0].designationTitleGu).toBe('સિનિયર કારકુન');
    expect(history[0].relieveReason).toBe('TRANSFERRED');
    expect(history[0].orderNo).toBe('EST/TR/2024/45');
    expect(mockEq).toHaveBeenCalledWith('employee_id', 'emp-1');
  });

  it('updates employee transfer_date and active status when relieved due to transfer', async () => {
    const mockSelectSingle = vi.fn().mockResolvedValue({
      data: { id: 'pos-1', current_employee_id: 'emp-1', status_date: '2022-04-01' },
      error: null,
    });
    const mockSelectEq = vi.fn().mockReturnValue({ single: mockSelectSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'positions') {
        return {
          select: mockSelect,
          update: mockUpdate,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'position_history') {
        return {
          insert: mockInsert,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'establishment_employees') {
        return {
          update: mockUpdate,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    await relieveAndReassignPosition({
      positionId: 'pos-1',
      relieveDate: '2024-06-15',
      reason: 'TRANSFERRED',
      orderNo: 'EST/TR/2024/45',
      orderDate: '2024-06-10',
    });

    // Check that positions was set to VACANT
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'VACANT',
        status_date: '2024-06-15',
        current_employee_id: null,
      })
    );

    // Check that establishment_employees was marked transferred with the relieve date
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        transfer_date: '2024-06-15',
        active: false,
      })
    );
  });

  it('syncs employee position assignment from employee register', async () => {
    const mockSelectSingle = vi.fn().mockResolvedValue({
      data: { id: 'pos-vacant', current_employee_id: null, status: 'VACANT', position_no: 'POS-05' },
      error: null,
    });
    const mockSelectEq = vi.fn().mockReturnValue({ single: mockSelectSingle });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq });

    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq });
    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'positions') {
        return {
          select: mockSelect,
          update: mockUpdate,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      if (table === 'position_history') {
        return {
          insert: mockInsert,
        } as unknown as ReturnType<typeof supabase.from>;
      }
      return {} as unknown as ReturnType<typeof supabase.from>;
    });

    await syncEmployeePositionAssignment({
      employeeId: 'emp-new',
      newPositionId: 'pos-vacant',
      previousPositionId: 'pos-old',
      effectiveDate: '2026-05-01',
    });

    // Vacated old position
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'VACANT',
        current_employee_id: null,
      })
    );

    // Filled new position
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'FILLED',
        current_employee_id: 'emp-new',
      })
    );

    // History recorded
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('does not touch the database when the position assignment is unchanged', async () => {
    await syncEmployeePositionAssignment({
      employeeId: 'emp-1',
      newPositionId: 'pos-1',
      previousPositionId: 'pos-1',
      effectiveDate: '2026-05-01',
    });

    expect(supabase.from).not.toHaveBeenCalled();
  });
});
