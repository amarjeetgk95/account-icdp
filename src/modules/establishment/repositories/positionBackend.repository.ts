// ============================================================================
// SINGLE-OFFICE POSITION REPOSITORY (ICDP SURAT)
// Handles discrete positions, postings, budget heads, and resolution attachments.
// ============================================================================
import { supabase } from '@/core/supabase/client';
import type { Database } from '@/shared/database.types';
import type {
  EstablishmentRecord,
  PositionStatus,
  EstablishmentBudgetHead,
  PositionHistoryEntry,
} from '../types';
import { formatDateDDMMYYYY, todayISODate } from '@/shared/utilities/date';
import { cadreClassFromPayLevel, englishDesignationOf } from '../constants/establishmentPostCatalog';

const RESOLUTION_PDF_BUCKET = 'resolution-pdfs';

const statusMap: Record<string, PositionStatus> = {
  FILLED: 'Filled',
  VACANT: 'Vacant',
  UNDER_CHARGE: 'Under Charge',
  ABOLISHED: 'Abolished',
  CANCELLED: 'Cancelled',
};

const reverseStatusMap: Record<PositionStatus, 'FILLED' | 'VACANT' | 'UNDER_CHARGE' | 'ABOLISHED' | 'CANCELLED'> = {
  Filled: 'FILLED',
  Vacant: 'VACANT',
  'Under Charge': 'UNDER_CHARGE',
  Abolished: 'ABOLISHED',
  Cancelled: 'CANCELLED',
};

export interface PositionCreateInput {
  positionNo: string;
  designationTitleGu: string;
  designationTitleEn?: string;
  cadreClass?: string;
  payMatrixLevel?: string;
  payScale?: string;
  budgetHeadId?: string | null;
  status: PositionStatus;
  statusDate: string;
  currentEmployeeId?: string | null;
  chargeEmployeeId?: string | null;
  headquarter?: string;
  displayOrder?: number | null;
  resolutionNote?: string;
  resolutionPdfUrl?: string;
  grId?: string | null;
  remarks?: string;
}

export interface PositionUpdateInput {
  positionNo?: string;
  designationTitleGu?: string;
  designationTitleEn?: string;
  cadreClass?: string;
  payMatrixLevel?: string;
  payScale?: string;
  budgetHeadId?: string | null;
  status?: PositionStatus;
  statusDate?: string;
  currentEmployeeId?: string | null;
  chargeEmployeeId?: string | null;
  headquarter?: string;
  displayOrder?: number | null;
  resolutionNote?: string;
  resolutionPdfUrl?: string;
  grId?: string | null;
  remarks?: string;
}

/** Lightweight GR rows for the establishment position form dropdown. */
export interface EstablishmentGrOption {
  id: string;
  grNumber: string;
  title: string;
  issueDate: string | null;
  storagePath: string | null;
}

/**
 * The `gr_id` column is added by migration 070. Probe once per session so the
 * register keeps working (posts stay visible) on databases where the migration
 * has not been applied yet.
 */
let grColumnAvailable: boolean | null = null;
async function ensureGrColumn(): Promise<boolean> {
  if (grColumnAvailable !== null) return grColumnAvailable;
  const { error } = await supabase.from('positions').select('gr_id').limit(1);
  if (!error) {
    grColumnAvailable = true;
  } else if (
    error.code === '42703' ||
    /column .*gr_id.* does not exist/i.test(error.message || '')
  ) {
    // Only cache a definitive "column missing" result. Transient failures
    // should be retried on the next call rather than disabling GR links for
    // the rest of the session.
    grColumnAvailable = false;
  }
  return !error;
}

const GR_COLUMN_MISSING_MESSAGE =
  'Cannot save the Government Resolution link: the positions.gr_id column is missing. Apply migration 070_positions_gr_link.sql and try again.';

const POSITION_SELECT_BASE = `
  *,
  current_employee:current_employee_id (
    id,
    name,
    name_gu,
    hrpn_no,
    mobile_no
  ),
  charge_employee:charge_employee_id (
    id,
    name,
    name_gu,
    hrpn_no,
    mobile_no
  ),
  budget_heads:budget_head_id (
    id,
    code,
    name
  )
`;

const POSITION_SELECT_WITH_GR = `${POSITION_SELECT_BASE},
  gr_repository:gr_id (
    id,
    gr_number,
    title,
    issue_date,
    storage_path
  )
`;

/** Fetch active Government Resolutions usable to sanction a post. */
export async function fetchEstablishmentGRs(): Promise<EstablishmentGrOption[]> {
  const { data, error } = await supabase
    .from('gr_repository')
    .select('id, gr_number, title, issue_date, storage_path')
    .eq('status', 'active')
    .order('gr_number', { ascending: true });

  if (error) {
    console.warn('Failed to load GR options:', error);
    return [];
  }

  return (data || []).map((g) => ({
    id: g.id,
    grNumber: g.gr_number || '',
    title: g.title || '',
    issueDate: g.issue_date || null,
    storagePath: g.storage_path || null,
  }));
}

export interface PositionRelieveInput {
  positionId: string;
  relieveDate: string;
  reason: 'TRANSFERRED' | 'RETIRED' | 'RESIGNED' | 'PROMOTED';
  orderNo?: string;
  orderDate?: string;
  newEmployeeId?: string | null;
  newStatus?: PositionStatus;
  remarks?: string;
}

/** Fetch all discrete positions for the ICDP Surat office */
export async function fetchPositionsList(): Promise<EstablishmentRecord[]> {
  const withGr = await ensureGrColumn();

  const runQuery = (select: string) =>
    supabase
      .from('positions')
      .select(select)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('position_no', { ascending: true });

  let { data, error } = await runQuery(withGr ? POSITION_SELECT_WITH_GR : POSITION_SELECT_BASE);

  // If the GR relationship is unavailable (e.g. migration not applied), fall
  // back to the base query so the register never renders empty.
  if (error && withGr) {
    console.warn('GR join unavailable, retrying without it:', error.message);
    ({ data, error } = await runQuery(POSITION_SELECT_BASE));
  }

  if (error) {
    console.error('Failed to fetch positions:', error);
    throw new Error(`Failed to load positions: ${error.message}`);
  }

  const rows = (data || []) as any[];

  return rows.map((pos, idx) => {
    const status: PositionStatus = statusMap[pos.status] || 'Vacant';
    const curEmp = pos.current_employee;
    const chgEmp = pos.charge_employee;
    const bHead = pos.budget_heads;
    const gr = pos.gr_repository;

    return {
      id: pos.id,
      srNo: idx + 1,
      postName: pos.designation_title_gu || pos.designation_title || 'Position',
      designationTitleEn: pos.designation_title || englishDesignationOf(pos.designation_title_gu),
      designationTitleGu: pos.designation_title_gu || pos.designation_title || '',
      status,
      statusDate: formatDateDDMMYYYY(pos.status_date),
      employeeName: curEmp?.name_gu || curEmp?.name || '-',
      hrpnNo: curEmp?.hrpn_no || '-',
      positionNo: pos.position_no || '-',
      mobileNo: curEmp?.mobile_no || '-',
      chargeHrpnNo: chgEmp?.hrpn_no || '-',
      chargeNameGu: chgEmp?.name_gu || chgEmp?.name || undefined,
      chargeMobileNo: chgEmp?.mobile_no || undefined,
      currentEmployeeId: pos.current_employee_id || null,
      chargeEmployeeId: pos.charge_employee_id || null,
      designationId: pos.designation_title_gu,
      cadreClass: pos.cadre_class || cadreClassFromPayLevel(pos.pay_matrix_level),
      headquarter: pos.headquarter || undefined,
      budgetHeadId: pos.budget_head_id != null ? String(pos.budget_head_id) : null,
      budgetHeadCode: bHead?.code || '',
      budgetHeadNameGu: bHead?.name || '',
      displayOrder: pos.display_order,
      resolutionNote: pos.resolution_note || undefined,
      resolutionPdfUrl: pos.resolution_pdf_url || undefined,
      grId: pos.gr_id || null,
      grNumber: gr?.gr_number || null,
      grTitle: gr?.title || null,
      grIssueDate: gr?.issue_date ? formatDateDDMMYYYY(gr.issue_date) : null,
      grStoragePath: gr?.storage_path || null,
      remarks: pos.remarks || undefined,
    };
  });
}

/** Create a new discrete position */
export async function createPositionRecord(input: PositionCreateInput): Promise<string> {
  const enTitle = input.designationTitleEn || englishDesignationOf(input.designationTitleGu);
  const cadre = input.cadreClass || cadreClassFromPayLevel(input.payMatrixLevel);
  const canStoreGr = input.grId ? await ensureGrColumn() : false;
  if (input.grId && !canStoreGr) throw new Error(GR_COLUMN_MISSING_MESSAGE);

  const payload: Database['public']['Tables']['positions']['Insert'] = {
    position_no: input.positionNo.trim(),
    designation_title: enTitle,
    designation_title_gu: input.designationTitleGu.trim(),
    cadre_class: cadre,
    pay_matrix_level: input.payMatrixLevel || null,
    pay_scale: input.payScale || null,
    budget_head_id: input.budgetHeadId || null,
    status: reverseStatusMap[input.status] || 'VACANT',
    status_date: input.statusDate || todayISODate(),
    current_employee_id: input.currentEmployeeId || null,
    charge_employee_id: input.chargeEmployeeId || null,
    headquarter: input.headquarter?.trim() || null,
    display_order: input.displayOrder ?? null,
    resolution_note: input.resolutionNote || null,
    resolution_pdf_url: input.resolutionPdfUrl || null,
    remarks: input.remarks || null,
  };
  if (canStoreGr) payload.gr_id = input.grId || null;

  const { data, error } = await supabase
    .from('positions')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create position:', error);
    throw new Error(`Failed to create position: ${error.message}`);
  }

  // If created with an active employee, record initial history entry
  if (input.currentEmployeeId && data?.id) {
    await supabase.from('position_history').insert({
      position_id: data.id,
      employee_id: input.currentEmployeeId,
      assignment_type: 'REGULAR',
      start_date: input.statusDate || todayISODate(),
      remarks: 'Initial position allotment',
    });
  }

  return data.id;
}

/** Update an existing discrete position */
export async function updatePositionRecord(id: string, input: PositionUpdateInput): Promise<void> {
  const patch: Database['public']['Tables']['positions']['Update'] = {};
  const canStoreGr = input.grId !== undefined ? await ensureGrColumn() : false;
  if (input.grId && !canStoreGr) throw new Error(GR_COLUMN_MISSING_MESSAGE);

  if (input.positionNo !== undefined) patch.position_no = input.positionNo.trim();
  if (input.designationTitleGu !== undefined) {
    patch.designation_title_gu = input.designationTitleGu.trim();
    patch.designation_title = input.designationTitleEn || englishDesignationOf(input.designationTitleGu);
  }
  if (input.cadreClass !== undefined) patch.cadre_class = input.cadreClass;
  if (input.payMatrixLevel !== undefined) patch.pay_matrix_level = input.payMatrixLevel;
  if (input.payScale !== undefined) patch.pay_scale = input.payScale;
  if (input.budgetHeadId !== undefined) patch.budget_head_id = input.budgetHeadId;
  if (input.status !== undefined) patch.status = reverseStatusMap[input.status];
  if (input.statusDate !== undefined) patch.status_date = input.statusDate;
  if (input.currentEmployeeId !== undefined) patch.current_employee_id = input.currentEmployeeId;
  if (input.chargeEmployeeId !== undefined) patch.charge_employee_id = input.chargeEmployeeId;
  if (input.headquarter !== undefined) patch.headquarter = input.headquarter.trim() || null;
  if (input.displayOrder !== undefined) patch.display_order = input.displayOrder;
  if (input.resolutionNote !== undefined) patch.resolution_note = input.resolutionNote;
  if (input.resolutionPdfUrl !== undefined) patch.resolution_pdf_url = input.resolutionPdfUrl;
  if (input.grId !== undefined && canStoreGr) patch.gr_id = input.grId;
  if (input.remarks !== undefined) patch.remarks = input.remarks;

  const { error } = await supabase
    .from('positions')
    .update(patch)
    .eq('id', id);

  if (error) {
    console.error('Failed to update position:', error);
    throw new Error(`Failed to update position: ${error.message}`);
  }
}

/**
 * Relieve incumbent employee and safely transfer/vacate/reassign the post.
 * Creates an immutable audit entry in position_history.
 */
export async function relieveAndReassignPosition(input: PositionRelieveInput): Promise<void> {
  // 1. Fetch current position state
  const { data: pos, error: posErr } = await supabase
    .from('positions')
    .select('id, current_employee_id, status_date')
    .eq('id', input.positionId)
    .single();

  if (posErr || !pos) throw new Error('Position not found');

  // 2. If occupied, close incumbent's history entry
  if (pos.current_employee_id) {
    await supabase.from('position_history').insert({
      position_id: input.positionId,
      employee_id: pos.current_employee_id,
      assignment_type: 'REGULAR',
      start_date: pos.status_date,
      end_date: input.relieveDate,
      order_no: input.orderNo || null,
      order_date: input.orderDate || null,
      relieve_reason: input.reason,
      remarks: input.remarks || null,
    });
  }

  // 3. Reassign to new employee OR vacate
  const newStatus = input.newEmployeeId ? 'FILLED' : (input.newStatus ? reverseStatusMap[input.newStatus] : 'VACANT');
  await supabase
    .from('positions')
    .update({
      status: newStatus,
      status_date: input.relieveDate,
      current_employee_id: input.newEmployeeId || null,
      charge_employee_id: null,
    })
    .eq('id', input.positionId);

  // 4. If new employee was assigned, open new history record
  if (input.newEmployeeId) {
    await supabase.from('position_history').insert({
      position_id: input.positionId,
      employee_id: input.newEmployeeId,
      assignment_type: 'TRANSFER_IN',
      start_date: input.relieveDate,
      order_no: input.orderNo || null,
      order_date: input.orderDate || null,
      remarks: 'Joined via transfer / assignment',
    });

    // Ensure incoming employee is marked active with no stale transfer date
    await supabase
      .from('establishment_employees')
      .update({
        transfer_date: null,
        active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.newEmployeeId);
  }

  // 5. If incumbent was relieved due to transfer/retirement/resignation, update employee lifecycle
  if (pos.current_employee_id && (input.reason === 'TRANSFERRED' || input.reason === 'RETIRED' || input.reason === 'RESIGNED')) {
    await supabase
      .from('establishment_employees')
      .update({
        transfer_date: input.relieveDate,
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pos.current_employee_id);
  }
}

/** Fetch career posting timeline for a specific employee */
export async function fetchEmployeePostingHistory(employeeId: string): Promise<PositionHistoryEntry[]> {
  const { data, error } = await supabase
    .from('position_history')
    .select(`
      *,
      position:position_id (
        id,
        position_no,
        designation_title_gu,
        cadre_class,
        budget_heads:budget_head_id (id, code, name)
      )
    `)
    .eq('employee_id', employeeId)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Failed to fetch employee posting history:', error);
    throw new Error(`Failed to load employee history: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    positionId: row.position_id,
    employeeId: row.employee_id,
    assignmentType: row.assignment_type,
    startDate: formatDateDDMMYYYY(row.start_date),
    endDate: row.end_date ? formatDateDDMMYYYY(row.end_date) : null,
    orderNo: row.order_no || null,
    orderDate: row.order_date ? formatDateDDMMYYYY(row.order_date) : null,
    relieveReason: row.relieve_reason || null,
    remarks: row.remarks || null,
    createdAt: row.created_at,
    positionNo: row.position?.position_no || '-',
    designationTitleGu: row.position?.designation_title_gu || 'Position',
    cadreClass: row.position?.cadre_class || '',
    budgetHeadName: row.position?.budget_heads?.name || '',
  }));
}

/** Fetch historical occupants for a specific position */
export async function fetchPositionIncumbencyHistory(positionId: string): Promise<PositionHistoryEntry[]> {
  const { data, error } = await supabase
    .from('position_history')
    .select(`
      *,
      employee:employee_id (
        id,
        name,
        name_gu,
        hrpn_no,
        mobile_no
      )
    `)
    .eq('position_id', positionId)
    .order('start_date', { ascending: false });

  if (error) {
    console.error('Failed to fetch position incumbency history:', error);
    throw new Error(`Failed to load position history: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    positionId: row.position_id,
    employeeId: row.employee_id,
    assignmentType: row.assignment_type,
    startDate: formatDateDDMMYYYY(row.start_date),
    endDate: row.end_date ? formatDateDDMMYYYY(row.end_date) : null,
    orderNo: row.order_no || null,
    orderDate: row.order_date ? formatDateDDMMYYYY(row.order_date) : null,
    relieveReason: row.relieve_reason || null,
    remarks: row.remarks || null,
    createdAt: row.created_at,
    employeeName: row.employee?.name || '-',
    employeeNameGu: row.employee?.name_gu || row.employee?.name || '-',
    hrpnNo: row.employee?.hrpn_no || '-',
    mobileNo: row.employee?.mobile_no || '-',
  }));
}

/** Upload resolution PDF to Supabase Storage */
export async function uploadResolutionPdf(file: File): Promise<string> {
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('PDF file size must not exceed 2 MB.');
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `icdp_surat/${Date.now()}_${cleanName}`;

  const { error } = await supabase.storage
    .from(RESOLUTION_PDF_BUCKET)
    .upload(path, file, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (error) {
    console.error('Failed to upload PDF:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from(RESOLUTION_PDF_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Fetch Budget Heads for ICDP Surat */
export async function fetchOfficeBudgetHeads(): Promise<EstablishmentBudgetHead[]> {
  const { data, error } = await supabase
    .from('budget_heads')
    .select('id, code, name, sort_order')
    .order('sort_order', { ascending: true });

  if (error) {
    console.warn('Failed to fetch budget heads:', error);
    return [];
  }

  return (data || []).map((b) => ({
    id: b.id,
    headCode: b.code,
    title: b.name,
    titleGu: b.name,
    isActive: true,
  }));
}

export interface EmployeePositionSyncInput {
  employeeId: string;
  newPositionId: string | null;
  /**
   * `undefined` = caller does not know (repository looks it up);
   * `null` = caller knows the employee holds no position (no lookup needed).
   */
  previousPositionId?: string | null;
  effectiveDate?: string;
  isTransferred?: boolean;
}

/**
 * Synchronize position assignment directly from Employee Register.
 * Enforces:
 * 1. Only vacant positions can be newly assigned.
 * 2. If employee had a previous position, it is vacated and recorded in position_history.
 * 3. If employee is transferred or unassigned, their position is vacated cleanly.
 */
export async function syncEmployeePositionAssignment(
  input: EmployeePositionSyncInput
): Promise<void> {
  const effectiveDate = input.effectiveDate || todayISODate();
  const newPositionId = input.newPositionId ?? null;

  // Resolve the current position only when the caller genuinely does not know.
  // Passing `null` means "knows there is none" and saves a round-trip.
  let prevPosId: string | null;
  if (input.previousPositionId === undefined && input.employeeId) {
    const { data: currentHeld } = await supabase
      .from('positions')
      .select('id')
      .eq('current_employee_id', input.employeeId)
      .maybeSingle();
    prevPosId = currentHeld?.id ?? null;
  } else {
    prevPosId = input.previousPositionId ?? null;
  }

  // Nothing to do — do not touch the database on a plain employee edit.
  if (!input.isTransferred && prevPosId === newPositionId) {
    return;
  }

  // Kick off the occupancy check while the old position is being vacated.
  const newPositionPromise =
    newPositionId && !input.isTransferred
      ? Promise.resolve(
          supabase
            .from('positions')
            .select('id, current_employee_id, status, position_no')
            .eq('id', newPositionId)
            .single()
        )
      : null;

  // 1. If employee was occupying a position and is now transferred OR changed positions:
  if (prevPosId && (prevPosId !== newPositionId || input.isTransferred)) {
    await Promise.all([
      supabase
        .from('positions')
        .update({
          status: 'VACANT',
          status_date: effectiveDate,
          current_employee_id: null,
        })
        .eq('id', prevPosId),
      supabase.from('position_history').insert({
        position_id: prevPosId,
        employee_id: input.employeeId,
        assignment_type: 'REGULAR',
        start_date: effectiveDate,
        end_date: effectiveDate,
        relieve_reason: input.isTransferred ? 'TRANSFERRED' : 'REASSIGNED',
        remarks: input.isTransferred
          ? 'Relieved via Employee Register (Transferred/Retired)'
          : 'Reassigned to another post via Employee Register',
      }),
    ]);
  }

  // 2. If new position is selected and employee is NOT transferred:
  if (newPositionId && !input.isTransferred) {
    // Check if new position is already filled by someone else
    const { data: pos, error: posErr } = await newPositionPromise!;

    if (posErr || !pos) throw new Error('Selected position not found');

    if (pos.current_employee_id && pos.current_employee_id !== input.employeeId) {
      throw new Error(
        `Position #${pos.position_no} is already filled by another employee. Please select a vacant position.`
      );
    }

    // Assign position and, if newly assigned, record history in parallel.
    await Promise.all([
      supabase
        .from('positions')
        .update({
          status: 'FILLED',
          status_date: effectiveDate,
          current_employee_id: input.employeeId,
        })
        .eq('id', newPositionId),
      prevPosId !== newPositionId
        ? supabase.from('position_history').insert({
            position_id: newPositionId,
            employee_id: input.employeeId,
            assignment_type: 'REGULAR',
            start_date: effectiveDate,
            end_date: null,
            remarks: 'Assigned via Employee Register',
          })
        : Promise.resolve({ error: null }),
    ]);
  }
}

