import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Printer,
  Download,
  FileSpreadsheet,
  Edit,
  ArrowRightLeft,
  FileText,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
  History,
  Users,
  Award,
} from 'lucide-react';
import type { EstablishmentRecord, EstablishmentEmployee } from '../types';
import { isResolutionStatus, establishmentPostDisplayName } from '../types';
import { CompactPageHeader, headerBtn, headerBtnPrimary } from './CompactPageHeader';
import { ResolutionPostsToggle } from './ResolutionPostsToggle';
import { PositionFormModal, PositionFormValue } from './PositionFormModal';
import { PositionReliefModal } from './PositionReliefModal';
import { PostingHistoryModal, PostingHistoryTarget } from './PostingHistoryModal';
import {
  createPositionRecord,
  updatePositionRecord,
  fetchOfficeBudgetHeads,
} from '../repositories/positionBackend.repository';
import { useEstablishmentEmployees, useSaveEstablishmentEmployee } from '../hooks/useEstablishment';
import { useEstablishmentPositions } from '../hooks/useEstablishmentPositions';
import { createBlankEstablishmentEmployee } from '../constants';
import { normalizeEstablishmentHrpn } from '../validation/establishment.schema';
import { exportEstablishmentCSV } from '../utils/csvExport';
import { exportEstablishmentExcel } from '../utils/excelExport';
import { englishDesignationOf } from '../constants/establishmentPostCatalog';
import { popupNativePrint } from '@/shared/utilities';
import { grDocumentStorage } from '@/modules/gr/services/grDocumentStorage.service';

/** Element id of the printable register — the print engine targets this. */
const PRINT_AREA_ID = 'establishment-register-print';

export const OfficeEstablishmentView: React.FC = () => {
  const navigate = useNavigate();
  const employeesQuery = useEstablishmentEmployees();
  const saveEmployeeMutation = useSaveEstablishmentEmployee();
  const positionsQuery = useEstablishmentPositions();
  const budgetHeadsQuery = useQuery({
    queryKey: ['establishmentBudgetHeads'],
    queryFn: fetchOfficeBudgetHeads,
    staleTime: 5 * 60_000,
  });
  const records = useMemo(() => positionsQuery.data ?? [], [positionsQuery.data]);
  const budgetHeads = useMemo(() => budgetHeadsQuery.data ?? [], [budgetHeadsQuery.data]);
  const loading = positionsQuery.isLoading || budgetHeadsQuery.isLoading;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [includeResolutionPosts, setIncludeResolutionPosts] = useState(false);

  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<EstablishmentRecord | null>(null);
  const [isReliefModalOpen, setIsReliefModalOpen] = useState(false);
  const [reliefRecord, setReliefRecord] = useState<EstablishmentRecord | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<PostingHistoryTarget | null>(null);

  // Collapsed budget head groups
  const [collapsedHeads, setCollapsedHeads] = useState<Record<string, boolean>>({});

  // KPIs
  const stats = useMemo(() => {
    let sanctioned = 0;
    let filled = 0;
    let vacant = 0;
    let underCharge = 0;
    let resolutionCount = 0;

    for (const r of records) {
      if (isResolutionStatus(r.status)) {
        resolutionCount += 1;
      } else {
        sanctioned += 1;
        if (r.status === 'Filled') filled += 1;
        else if (r.status === 'Vacant') vacant += 1;
        else if (r.status === 'Under Charge') underCharge += 1;
      }
    }

    return { sanctioned, filled, vacant, underCharge, resolutionCount };
  }, [records]);

  // Filtering
  const filteredRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return records.filter((r) => {
      // Abeyance toggle
      if (!includeResolutionPosts && isResolutionStatus(r.status)) return false;

      // Status filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;

      // Search query
      if (q) {
        const matchesPost = r.postName.toLowerCase().includes(q);
        const matchesHq = (r.headquarter || '').toLowerCase().includes(q);
        const matchesEmp = r.employeeName.toLowerCase().includes(q);
        const matchesHrpn = r.hrpnNo.toLowerCase().includes(q);
        const matchesPos = r.positionNo.toLowerCase().includes(q);
        const matchesCharge = (r.chargeNameGu || '').toLowerCase().includes(q) || r.chargeHrpnNo.toLowerCase().includes(q);
        const matchesGr = (r.grNumber || '').toLowerCase().includes(q);
        if (!matchesPost && !matchesHq && !matchesEmp && !matchesHrpn && !matchesPos && !matchesCharge && !matchesGr) {
          return false;
        }
      }

      return true;
    });
  }, [records, searchQuery, statusFilter, includeResolutionPosts]);

  // Group by Budget Head
  const groupedRecords = useMemo(() => {
    const map = new Map<string, { headTitle: string; headCode: string; records: EstablishmentRecord[] }>();

    // Initial group for Unassigned
    map.set('unassigned', { headTitle: 'Unassigned / General', headCode: 'UNASSIGNED', records: [] });

    for (const b of budgetHeads) {
      map.set(b.id, { headTitle: b.titleGu, headCode: b.headCode, records: [] });
    }

    for (const r of filteredRecords) {
      const key = r.budgetHeadId && map.has(r.budgetHeadId) ? r.budgetHeadId : 'unassigned';
      map.get(key)!.records.push(r);
    }

    // Filter out empty groups except unassigned if it has items
    return Array.from(map.entries())
      .map(([id, grp]) => ({ id, ...grp }))
      .filter((g) => g.records.length > 0);
  }, [filteredRecords, budgetHeads]);

  const toggleHeadCollapse = (id: string) => {
    setCollapsedHeads((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const resolveOccupantId = async (
    employees: EstablishmentEmployee[],
    input: {
      hrpnNo: string;
      nameGu: string;
      mobileNo?: string;
      designationGu?: string;
    }
  ): Promise<string | null> => {
    const hrpn = normalizeEstablishmentHrpn(input.hrpnNo);
    if (!hrpn) return null;

    const nameGu = input.nameGu.trim();
    const mobileNo = (input.mobileNo ?? '').trim();
    const existing = employees.find((e) => normalizeEstablishmentHrpn(e.hrpnNo) === hrpn);

    if (existing) {
      const nextNameGu = nameGu || existing.nameGu;
      const nextMobileNo = mobileNo || existing.mobileNo;
      if (nextNameGu !== existing.nameGu || nextMobileNo !== existing.mobileNo) {
        const saved = await saveEmployeeMutation.mutateAsync({
          ...existing,
          nameGu: nextNameGu,
          mobileNo: nextMobileNo,
        });
        const index = employees.findIndex((e) => e.id === saved.id);
        if (index >= 0) employees[index] = saved;
      }
      return existing.id;
    }

    const employee: EstablishmentEmployee = {
      ...createBlankEstablishmentEmployee(),
      hrpnNo: hrpn,
      name: nameGu || hrpn,
      nameGu: nameGu || undefined,
      mobileNo: mobileNo || undefined,
      designationGu: input.designationGu || undefined,
    };
    const saved = await saveEmployeeMutation.mutateAsync(employee);
    employees.push(saved);
    return saved.id;
  };

  const handleSavePosition = async (val: PositionFormValue) => {
    const employees = employeesQuery.data
      ? [...employeesQuery.data]
      : [...((await employeesQuery.refetch()).data ?? [])];

    const currentEmployeeId =
      val.status === 'Filled'
        ? await resolveOccupantId(employees, {
            hrpnNo: val.hrpnNo,
            nameGu: val.employeeNameGu,
            mobileNo: val.mobileNo,
            designationGu: val.designationTitleGu,
          })
        : null;
    const chargeEmployeeId =
      val.status === 'Under Charge'
        ? await resolveOccupantId(employees, {
            hrpnNo: val.chargeHrpnNo,
            nameGu: val.chargeNameGu,
            mobileNo: val.chargeMobileNo,
          })
        : null;

    const payload = {
      positionNo: val.positionNo,
      designationTitleGu: val.designationTitleGu,
      designationTitleEn: val.designationTitleEn || englishDesignationOf(val.designationTitleGu),
      cadreClass: val.cadreClass,
      payMatrixLevel: val.payMatrixLevel,
      payScale: val.payScale,
      budgetHeadId: val.budgetHeadId || null,
      status: val.status,
      statusDate: val.statusDate,
      currentEmployeeId,
      chargeEmployeeId,
      headquarter: val.headquarter,
      resolutionNote: val.resolutionNote,
      resolutionPdfUrl: val.resolutionPdfUrl,
      grId: val.grId ?? null,
      remarks: val.remarks,
    };

    if (selectedRecord) {
      await updatePositionRecord(selectedRecord.id, payload);
    } else {
      await createPositionRecord(payload);
    }
    await positionsQuery.refetch();
  };

  /**
   * GR PDFs live in a private Supabase Storage bucket, so a signed URL must be
   * minted on click. Legacy resolution PDFs still open via their public URL.
   */
  const handleOpenDocument = async (
    storagePath?: string | null,
    fallbackUrl?: string | null
  ): Promise<void> => {
    if (storagePath) {
      try {
        await grDocumentStorage.openDocument(storagePath);
        return;
      } catch (err) {
        console.warn('[Establishment] Could not open the linked GR PDF:', err);
      }
    }
    if (fallbackUrl) {
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const getExportRows = () => {
    return filteredRecords.map((r, idx) => ({
      '૧. અ.નં.': idx + 1,
      '૨. જગ્યાનું નામ': establishmentPostDisplayName(r.postName, r.headquarter),
      '૩. જગ્યા સ્થિતી':
        r.status === 'Filled'
          ? 'ભરેલ'
          : r.status === 'Vacant'
          ? 'ખાલી'
          : r.status === 'Under Charge'
          ? 'ઈન્ચાર્જ'
          : r.status === 'Abolished'
          ? 'અબેયન્સ'
          : 'રદ',
      '૪. ખાલી/ભરેલ તારીખ': r.statusDate || '-',
      '૫. કર્મચારીનું નામ': r.employeeName || '-',
      '૬. HRPN No.': r.hrpnNo || '-',
      '૭. પોઝીશન નંબર': r.positionNo,
      '૮. મોબાઈલ નંબર': r.mobileNo || '-',
      '૯. ઈ/ચા HRPN વિગત':
        r.status === 'Under Charge'
          ? `ઈ/ચા ${r.chargeNameGu || ''} (${r.chargeHrpnNo || '-'})`
          : '-',
      '૧૦. સંક મંજૂરી ઠરાવ': r.grNumber || r.resolutionNote || '-',
    }));
  };

  const handleExportCSV = () => {
    exportEstablishmentCSV('ICDP_Surat_Establishment_Register.csv', getExportRows());
  };

  const handleExportExcel = async () => {
    await exportEstablishmentExcel(
      'ICDP_Surat_Establishment_Register.xlsx',
      getExportRows(),
      'મહેકમ રજીસ્ટર',
    );
  };

  const handlePrint = () => {
    // Print ONLY the register tables. The global print engine hides anything
    // outside `.report-print-area` (body { visibility: hidden }), so an
    // unwrapped register prints as a blank page.
    const el = document.getElementById(PRINT_AREA_ID) as HTMLElement | null;
    if (el) {
      popupNativePrint({
        elements: [el],
        title: 'Establishment_Register',
        pageSize: 'A4',
        orientation: 'landscape',
        pageMargin: '8mm',
        pageContainerSelector: '.report-print-area',
      });
    } else {
      window.print();
    }
  };

  return (
    <div className="space-y-4 font-gujSans">
      {/* 1. Header Banner with Live KPIs */}
      <CompactPageHeader
        icon={<Layers className="h-5 w-5 text-blue-700" />}
        title="Establishment Register"
        titleGu="ICDP SURAT"
        stats={[
          { label: 'Sanctioned', gu: 'મંજૂર મહેકમ', value: stats.sanctioned, text: 'text-slate-900', accent: 'border-l-blue-600' },
          { label: 'Filled', gu: 'ભરેલ જગ્યા', value: stats.filled, text: 'text-emerald-700', accent: 'border-l-emerald-600' },
          { label: 'Vacant', gu: 'ખાલી જગ્યા', value: stats.vacant, text: 'text-rose-700', accent: 'border-l-rose-600' },
          { label: 'Under Charge', gu: 'ઈન્ચાર્જ', value: stats.underCharge, text: 'text-amber-700', accent: 'border-l-amber-600' },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => navigate('/establishment/employees')}
              className={headerBtn}
              title="View Employee Register"
            >
              <Users className="h-3.5 w-3.5 text-blue-600" />
              <span>Staff List →</span>
            </button>
            <button
              onClick={() => navigate('/establishment/posts/master')}
              className={headerBtn}
              title="Post Names & Pay Scales Master"
            >
              <Award className="h-3.5 w-3.5 text-indigo-600" />
              <span>Post Master</span>
            </button>
            <button
              onClick={() => {
                setSelectedRecord(null);
                setIsFormModalOpen(true);
              }}
              className={headerBtnPrimary}
            >
              <Plus className="h-4 w-4" />
              <span>Add Position</span>
            </button>
            <button onClick={handleExportCSV} className={headerBtn} title="Download CSV">
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
            <button onClick={handleExportExcel} className={headerBtn} title="Download Excel">
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              <span>Excel</span>
            </button>
            <button onClick={handlePrint} className={headerBtn} title="Print">
              <Printer className="h-3.5 w-3.5 text-slate-600" />
              <span>Print</span>
            </button>
          </div>
        }
      />

      {/* 2. Controls & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm no-print">
        <div className="flex w-full flex-1 flex-wrap items-center gap-3 min-w-0 sm:flex-nowrap sm:min-w-[280px]">
          {/* Search box */}
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by post name, employee, HRPN or position number..."
              className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-[38px] shrink-0 rounded-lg border border-slate-300 py-1.5 px-2.5 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="Filled">Filled</option>
            <option value="Vacant">Vacant</option>
            <option value="Under Charge">Under Charge</option>
            <option value="Abolished">Abolished</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-start">
          <ResolutionPostsToggle
            checked={includeResolutionPosts}
            onChange={setIncludeResolutionPosts}
            hiddenCount={stats.resolutionCount}
          />

          <button
            onClick={() => {
              void positionsQuery.refetch();
            }}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. The Statutory 9-Column Gujarati Table (Grouped by Budget Head).
          Wrapped in `.report-print-area` — the global print engine hides every
          element outside it, so an unwrapped register prints as a blank page. */}
      <div id={PRINT_AREA_ID} className="report-print-area space-y-4 font-gujSans">
        {loading && records.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            Loading establishment register...
          </div>
        ) : groupedRecords.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            No positions found matching filter.
          </div>
        ) : (
          groupedRecords.map((group) => {
            const isCollapsed = collapsedHeads[group.id];

            return (
              <div
                key={group.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                {/* Budget Head Group Header Banner */}
                <div
                  onClick={() => toggleHeadCollapse(group.id)}
                  className="flex cursor-pointer items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 py-2.5 transition hover:bg-slate-100"
                >
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className="rounded bg-blue-100 px-2 py-0.5 num text-xs font-bold text-blue-800">
                      {group.headCode}
                    </span>
                    <h2 className="text-xs font-bold text-slate-900">{group.headTitle}</h2>
                    <span className="text-xs text-slate-500">({group.records.length} positions)</span>
                  </div>
                  <button className="shrink-0 text-slate-400" aria-label="Toggle budget head group">
                    {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>

                {/* Table Content */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="table-mobile-cards w-full text-left border-collapse text-xs font-gujSans">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-100/60 font-semibold text-slate-700">
                          <th className="py-2.5 px-3 text-center w-12">૧. અ.નં.</th>
                          <th className="py-2.5 px-3 min-w-[180px]">૨. જગ્યાનું નામ (પદનામ)</th>
                          <th className="py-2.5 px-3 text-center w-28">૩. જગ્યા સ્થિતી</th>
                          <th className="py-2.5 px-3 text-center w-28">૪. ખાલી/ભરેલ તા.</th>
                          <th className="py-2.5 px-3 min-w-[170px]">૫. કર્મચારીનું નામ</th>
                          <th className="py-2.5 px-3 text-center w-28 font-gujSans">૬. HRPN No.</th>
                          <th className="py-2.5 px-3 text-center w-28 font-gujSans">૭. પોઝીશન નંબર</th>
                          <th className="py-2.5 px-3 text-center w-28">૮. મોબાઈલ નંબર</th>
                          <th className="py-2.5 px-3 min-w-[160px]">૯. ઈ/ચા HRPN વિગત</th>
                          <th className="py-2.5 px-3 text-center w-24 no-print">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-normal text-slate-800">
                        {group.records.map((r, rowIdx) => {
                          const isRes = isResolutionStatus(r.status);

                          return (
                            <tr
                              key={r.id}
                              className={`transition hover:bg-blue-50/40 ${
                                isRes
                                  ? 'bg-purple-50/30 text-slate-500 italic'
                                  : r.status === 'Vacant'
                                  ? 'bg-rose-50/20'
                                  : r.status === 'Under Charge'
                                  ? 'bg-amber-50/20'
                                  : ''
                              }`}
                            >
                              {/* 1. Sr. No. */}
                              <td data-label="અ.નં." className="py-2.5 px-3 text-center font-medium text-slate-500">
                                {rowIdx + 1}
                              </td>

                              {/* 2. Post Name */}
                              <td data-label="જગ્યાનું નામ" className="cell-full py-2.5 px-3 font-semibold text-slate-900">
                                <div>{establishmentPostDisplayName(r.postName, r.headquarter)}</div>
                                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                                  {r.cadreClass && (
                                    <span className="inline-block rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-normal text-slate-600">
                                      {r.cadreClass}
                                    </span>
                                  )}
                                  {r.grNumber && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleOpenDocument(r.grStoragePath, r.resolutionPdfUrl)
                                      }
                                      disabled={!r.grStoragePath && !r.resolutionPdfUrl}
                                      className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100 disabled:cursor-default disabled:opacity-70"
                                      title={r.grTitle || 'Sanctioning Government Resolution'}
                                    >
                                      <FileText className="h-3 w-3" />
                                      <span>GR: {r.grNumber}</span>
                                    </button>
                                  )}
                                </div>
                              </td>

                              {/* 3. Status Badge */}
                              <td data-label="સ્થિતી" className="py-2.5 px-3 text-center">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                    r.status === 'Filled'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : r.status === 'Vacant'
                                      ? 'bg-rose-100 text-rose-800'
                                      : r.status === 'Under Charge'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-purple-100 text-purple-800'
                                  }`}
                                >
                                  {r.status === 'Filled'
                                    ? 'ભરેલ'
                                    : r.status === 'Vacant'
                                    ? 'ખાલી'
                                    : r.status === 'Under Charge'
                                    ? 'ઈન્ચાર્જ'
                                    : r.status === 'Abolished'
                                    ? 'અબેયન્સ'
                                    : 'રદ'}
                                </span>
                              </td>

                              {/* 4. Vacant/Filled Date */}
                              <td data-label="તારીખ" className="py-2.5 px-3 text-center num text-slate-600">
                                {r.statusDate}
                              </td>

                              {/* 5. Employee Name */}
                              <td data-label="કર્મચારી" className="py-2.5 px-3">
                                {isRes ? (
                                  <span className="text-[11px] text-purple-700 not-italic font-medium">
                                    {r.grNumber
                                      ? `ઠરાવ ${r.grNumber}`
                                      : r.resolutionNote || 'ઠરાવ વિગત નોંધેલ નથી'}
                                  </span>
                                ) : (
                                  <span className="font-semibold text-slate-900">{r.employeeName}</span>
                                )}
                              </td>

                              {/* 6. HRPN No. */}
                              <td data-label="HRPN" className="py-2.5 px-3 text-center num text-slate-700">
                                {r.hrpnNo}
                              </td>

                              {/* 7. Position No. (Departmental) */}
                              <td data-label="પોઝીશન" className="py-2.5 px-3 text-center num font-bold text-blue-700">
                                {r.positionNo}
                              </td>

                              {/* 8. Mobile Number */}
                              <td data-label="મોબાઈલ" className="py-2.5 px-3 text-center num text-slate-600">
                                {r.mobileNo}
                              </td>

                              {/* 9. Charge HRPN No. */}
                              <td data-label="ઈ/ચા" className="py-2.5 px-3 text-xs">
                                {r.status === 'Under Charge' ? (
                                  <div>
                                    <span className="font-bold text-amber-800">
                                      ઈ/ચા {r.chargeNameGu || '-'}
                                    </span>
                                    <span className="block num text-[11px] text-slate-500">
                                      {r.chargeHrpnNo}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="cell-actions py-2.5 px-3 text-center no-print">
                                <div className="flex items-center justify-center gap-1">
                                  {/* View resolution / GR PDF (single stored copy via GR linkage) */}
                                  {r.grStoragePath || r.resolutionPdfUrl ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleOpenDocument(r.grStoragePath, r.resolutionPdfUrl)
                                      }
                                      className="rounded p-1 text-purple-600 hover:bg-purple-50"
                                      title={r.grNumber ? `View GR ${r.grNumber} PDF` : 'View Resolution PDF'}
                                    >
                                      <FileText className="h-4 w-4" />
                                    </button>
                                  ) : null}

                                  {/* Posting / Incumbency History button */}
                                  <button
                                    onClick={() => {
                                      setHistoryTarget(
                                        r.currentEmployeeId
                                          ? {
                                              type: 'EMPLOYEE',
                                              id: r.currentEmployeeId,
                                              name: r.employeeName,
                                              hrpn: r.hrpnNo,
                                            }
                                          : {
                                              type: 'POSITION',
                                              id: r.id,
                                              positionNo: r.positionNo,
                                              postName: r.postName,
                                            }
                                      );
                                      setIsHistoryModalOpen(true);
                                    }}
                                    className="rounded p-1 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                                    title="Posting History"
                                  >
                                    <History className="h-4 w-4" />
                                  </button>

                                  {/* Handover / Relieve button if Filled */}
                                  {r.status === 'Filled' && (
                                    <button
                                      onClick={() => {
                                        setReliefRecord(r);
                                        setIsReliefModalOpen(true);
                                      }}
                                      className="rounded p-1 text-amber-600 hover:bg-amber-50"
                                      title="Relieve / Handover"
                                    >
                                      <ArrowRightLeft className="h-4 w-4" />
                                    </button>
                                  )}

                                  {/* Edit button */}
                                  <button
                                    onClick={() => {
                                      setSelectedRecord(r);
                                      setIsFormModalOpen(true);
                                    }}
                                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                                    title="Edit Position"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <PositionFormModal
        key={isFormModalOpen ? selectedRecord?.id ?? 'new' : 'closed'}
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        record={selectedRecord}
        budgetHeads={budgetHeads}
        onSave={handleSavePosition}
      />

      <PositionReliefModal
        isOpen={isReliefModalOpen}
        onClose={() => setIsReliefModalOpen(false)}
        record={reliefRecord}
        onSuccess={() => {
          void positionsQuery.refetch();
        }}
      />

      <PostingHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryTarget(null);
        }}
        target={historyTarget}
      />
    </div>
  );
};
