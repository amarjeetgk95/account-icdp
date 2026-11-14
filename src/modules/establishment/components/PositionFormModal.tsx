import React, { useMemo, useState } from 'react';
import { X, Check, Upload, FileText, AlertCircle, Settings, Award } from 'lucide-react';
import type { EstablishmentRecord, EstablishmentBudgetHead, PositionStatus } from '../types';
import { isResolutionStatus } from '../types';
import { HrpnLookupInput, EmployeeHrpnHit } from './HrpnLookupInput';
import {
  ESTABLISHMENT_POST_OPTIONS,
  DEFAULT_POST_CATALOG,
  englishDesignationOf,
  cadreClassFromPayLevel,
  comparePostCatalogHigherToLower,
} from '../constants/establishmentPostCatalog';
import { useEstablishmentPostCatalog } from '../hooks/useEstablishmentPostCatalog';
import { todayISODate, toISODateOrNull } from '@/shared/utilities/date';
import { useDialogBehaviour } from '@/shared/hooks/useDialogBehaviour';
import { uploadResolutionPdf, fetchEstablishmentGRs } from '../repositories/positionBackend.repository';
import type { EstablishmentGrOption } from '../repositories/positionBackend.repository';
import { grDocumentStorage } from '@/modules/gr/services/grDocumentStorage.service';

// Gujarati character validator
export const GUJARATI_TEXT_REGEX = /^[\u0A80-\u0AFF\s.]+$/;

interface PositionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  record?: EstablishmentRecord | null;
  budgetHeads: EstablishmentBudgetHead[];
  onSave: (val: PositionFormValue) => Promise<void>;
}

export interface PositionFormValue {
  positionNo: string;
  designationTitleGu: string;
  designationTitleEn?: string;
  headquarter: string;
  cadreClass?: string;
  payMatrixLevel?: string;
  payScale?: string;
  budgetHeadId: string;
  status: PositionStatus;
  statusDate: string;
  employeeNameGu: string;
  hrpnNo: string;
  mobileNo: string;
  chargeHrpnNo: string;
  chargeNameGu: string;
  chargeMobileNo: string;
  resolutionNote: string;
  resolutionPdfUrl?: string;
  grId?: string | null;
  remarks: string;
  currentEmployeeId?: string | null;
  chargeEmployeeId?: string | null;
}

export const PositionFormModal: React.FC<PositionFormModalProps> = ({
  isOpen,
  onClose,
  record,
  budgetHeads,
  onSave,
}) => {
  const panelRef = useDialogBehaviour(onClose, isOpen);
  const postCatalogQuery = useEstablishmentPostCatalog();
  const postCatalog = useMemo(() => {
    const list = postCatalogQuery.data ?? DEFAULT_POST_CATALOG;
    return [...list].sort(comparePostCatalogHigherToLower);
  }, [postCatalogQuery.data]);

  const initial = record
    ? {
        positionNo: record.positionNo === '-' ? '' : record.positionNo,
        designationTitleGu: record.postName,
        headquarter: record.headquarter || '',
        budgetHeadId: record.budgetHeadId || '',
        status: record.status,
        statusDate: toISODateOrNull(record.statusDate) || todayISODate(),
        employeeNameGu: record.employeeName === '-' ? '' : record.employeeName,
        hrpnNo: record.hrpnNo === '-' ? '' : record.hrpnNo,
        mobileNo: record.mobileNo === '-' ? '' : record.mobileNo,
        chargeHrpnNo: record.chargeHrpnNo === '-' ? '' : record.chargeHrpnNo,
        chargeNameGu: record.chargeNameGu || '',
        chargeMobileNo: record.chargeMobileNo || '',
        resolutionNote: record.resolutionNote || '',
        resolutionPdfUrl: record.resolutionPdfUrl || '',
        grId: record.grId ?? null,
        remarks: record.remarks || '',
        currentEmployeeId: record.currentEmployeeId ?? null,
        chargeEmployeeId: record.chargeEmployeeId ?? null,
      }
    : {
        positionNo: '',
        designationTitleGu: ESTABLISHMENT_POST_OPTIONS[0]?.name || '',
        headquarter: '',
        budgetHeadId: budgetHeads[0]?.id || '',
        status: 'Vacant' as PositionStatus,
        statusDate: todayISODate(),
        employeeNameGu: '',
        hrpnNo: '',
        mobileNo: '',
        chargeHrpnNo: '',
        chargeNameGu: '',
        chargeMobileNo: '',
        resolutionNote: '',
        resolutionPdfUrl: '',
        grId: null,
        remarks: '',
        currentEmployeeId: null,
        chargeEmployeeId: null,
      };

  const [positionNo, setPositionNo] = useState(initial.positionNo);
  const [designationTitleGu, setDesignationTitleGu] = useState(initial.designationTitleGu);
  const [headquarter, setHeadquarter] = useState(initial.headquarter);
  const [budgetHeadId, setBudgetHeadId] = useState(initial.budgetHeadId);
  const [status, setStatus] = useState<PositionStatus>(initial.status);
  const [statusDate, setStatusDate] = useState(initial.statusDate);
  const [employeeNameGu, setEmployeeNameGu] = useState(initial.employeeNameGu);
  const [hrpnNo, setHrpnNo] = useState(initial.hrpnNo);
  const [mobileNo, setMobileNo] = useState(initial.mobileNo);
  const [chargeHrpnNo, setChargeHrpnNo] = useState(initial.chargeHrpnNo);
  const [chargeNameGu, setChargeNameGu] = useState(initial.chargeNameGu);
  const [chargeMobileNo, setChargeMobileNo] = useState(initial.chargeMobileNo);
  const [resolutionNote, setResolutionNote] = useState(initial.resolutionNote);
  const [resolutionPdfUrl, setResolutionPdfUrl] = useState(initial.resolutionPdfUrl);
  const [grId, setGrId] = useState<string | null>(initial.grId);
  const [grOptions, setGrOptions] = useState<EstablishmentGrOption[]>([]);
  const [remarks, setRemarks] = useState(initial.remarks);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string | null>(initial.currentEmployeeId);
  const [chargeEmployeeId, setChargeEmployeeId] = useState<string | null>(initial.chargeEmployeeId);

  // Fetch active Government Resolutions for the GR linkage dropdown.
  React.useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetchEstablishmentGRs().then((opts) => {
      if (!cancelled) setGrOptions(opts);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const [pdfUploading, setPdfUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle PDF upload
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setPdfUploading(true);
      setErrorMsg(null);
      const url = await uploadResolutionPdf(file);
      setResolutionPdfUrl(url);
    } catch (err: any) {
      setErrorMsg(err.message || 'PDF upload failed');
    } finally {
      setPdfUploading(false);
    }
  };

  const handlePrimaryEmployeePick = (hit: EmployeeHrpnHit) => {
    setCurrentEmployeeId(hit.id);
    setHrpnNo(hit.hrpn);
    setEmployeeNameGu(hit.nameGu);
    if (hit.mobile) setMobileNo(hit.mobile);
  };

  const handleChargeEmployeePick = (hit: EmployeeHrpnHit) => {
    setChargeEmployeeId(hit.id);
    setChargeHrpnNo(hit.hrpn);
    setChargeNameGu(hit.nameGu);
    if (hit.mobile) setChargeMobileNo(hit.mobile);
  };

  const handleGrSelect = (gr: EstablishmentGrOption | null) => {
    setGrId(gr?.id ?? null);
    if (gr && !resolutionNote.trim()) {
      setResolutionNote(`${gr.grNumber} — ${gr.title}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isResolutionStatus(status) && !positionNo.trim()) {
      setErrorMsg('Position No. is required.');
      return;
    }

    if (!designationTitleGu.trim()) {
      setErrorMsg('Designation is required.');
      return;
    }

    if (headquarter.trim() && !GUJARATI_TEXT_REGEX.test(headquarter.trim())) {
      setErrorMsg('Headquarter must be entered in Gujarati script (e.g. સેગવા).');
      return;
    }

    if (status === 'Filled') {
      const prevHrpn = (record?.hrpnNo || '').trim();
      if (
        record &&
        record.status === 'Filled' &&
        prevHrpn &&
        prevHrpn !== '-' &&
        hrpnNo.trim() !== prevHrpn
      ) {
        setErrorMsg(
          `This position is currently held by ${record.employeeName || 'an employee'} (HRPN: ${record.hrpnNo}). To reassign it, relieve the current occupant first using the Relieve / Handover action, or set status to Vacant.`
        );
        return;
      }

      if (!employeeNameGu.trim()) {
        setErrorMsg('Employee name is required for filled positions.');
        return;
      }
      if (!hrpnNo.trim()) {
        setErrorMsg('HRPN No. is required for filled positions.');
        return;
      }
      if (!GUJARATI_TEXT_REGEX.test(employeeNameGu.trim())) {
        setErrorMsg('Employee name must be entered in Gujarati script (e.g. રમેશભાઈ પટેલ).');
        return;
      }
    }

    if (status === 'Under Charge' && !chargeHrpnNo.trim()) {
      setErrorMsg('Charge employee HRPN is required for positions under charge.');
      return;
    }

    if (isResolutionStatus(status) && !resolutionNote.trim()) {
      setErrorMsg('Resolution note / reference is required for abolished or cancelled positions.');
      return;
    }

    try {
      setSaving(true);
      const postMatch = postCatalog.find((p) => p.nameGu.trim() === designationTitleGu.trim());
      await onSave({
        positionNo: isResolutionStatus(status) ? '-' : positionNo.trim(),
        designationTitleGu: designationTitleGu.trim(),
        designationTitleEn: postMatch?.nameEn || englishDesignationOf(designationTitleGu),
        headquarter: headquarter.trim(),
        cadreClass: postMatch?.cadreClass || cadreClassFromPayLevel(postMatch?.payLevel),
        payMatrixLevel: postMatch?.payLevel,
        payScale: postMatch?.payScale,
        budgetHeadId,
        status,
        statusDate,
        employeeNameGu: status === 'Filled' ? employeeNameGu.trim() : '-',
        hrpnNo: status === 'Filled' ? hrpnNo.trim() : '-',
        mobileNo: status === 'Filled' ? mobileNo.trim() : '-',
        chargeHrpnNo: status === 'Under Charge' ? chargeHrpnNo.trim() : '-',
        chargeNameGu: status === 'Under Charge' ? chargeNameGu.trim() : '',
        chargeMobileNo: status === 'Under Charge' ? chargeMobileNo.trim() : '',
        resolutionNote: isResolutionStatus(status) ? resolutionNote.trim() : '',
        resolutionPdfUrl: isResolutionStatus(status) && !grId ? resolutionPdfUrl : undefined,
        grId: grId || null,
        remarks: remarks.trim(),
        currentEmployeeId: status === 'Filled' ? currentEmployeeId : null,
        chargeEmployeeId: status === 'Under Charge' ? chargeEmployeeId : null,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save position');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={panelRef}
        tabIndex={-1}
        className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-2xl bg-white shadow-2xl focus:outline-none sm:max-h-[90vh] sm:rounded-xl"
      >
        {/* Header (sticky so the close action stays reachable while scrolling) */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900">
              {record ? 'Edit Sanctioned Position' : 'Add Sanctioned Position'}
            </h2>
            <p className="text-xs text-slate-500">ICDP Surat Establishment Register</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 sm:mx-6">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4 sm:px-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Position No */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Departmental Position No. *
              </label>
              <input
                type="text"
                value={positionNo}
                disabled={isResolutionStatus(status)}
                onChange={(e) => setPositionNo(e.target.value)}
                placeholder="e.g. POS-SRT-01 or 102/05/01"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
              />
              <span className="text-[10px] text-slate-500">Official department-assigned position number</span>
            </div>

            {/* Designation (Gujarati Dropdown) */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Designation (Gujarati) *
                </label>
                <a
                  href="/establishment/posts/master"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 hover:underline"
                  title="Open Post & Cadre Master"
                >
                  <Settings size={11} /> Manage Posts
                </a>
              </div>
              <select
                value={designationTitleGu}
                onChange={(e) => setDesignationTitleGu(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium font-gujSans"
              >
                {postCatalog.map((opt) => (
                  <option key={opt.id || opt.nameGu} value={opt.nameGu}>
                    {opt.nameGu} — {opt.cadreClass} ({opt.payLevel})
                  </option>
                ))}
              </select>
              {(() => {
                const match = postCatalog.find((p) => p.nameGu.trim() === designationTitleGu.trim());
                if (!match) return null;
                return (
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-[11px]">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                      <Award size={10} /> {match.cadreClass}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 font-mono font-semibold text-slate-700">
                      {match.payLevel}
                    </span>
                    {match.payScale && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono text-[10px] border border-emerald-200">
                        Scale: ₹{match.payScale}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Headquarter / Centre (Gujarati only) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700">
                Headquarter / Centre (Gujarati)
              </label>
              <input
                type="text"
                value={headquarter}
                onChange={(e) => setHeadquarter(e.target.value)}
                placeholder="e.g. સેગવા"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-gujSans"
              />
              <span className="text-[10px] text-slate-500">
                Required in Gujarati characters for statutory reports (e.g. સેગવા).
              </span>
            </div>

            {/* Budget Head */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Budget Head / Grant
              </label>
              <select
                value={budgetHeadId}
                onChange={(e) => setBudgetHeadId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">— Unassigned —</option>
                {budgetHeads.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.headCode} - {b.titleGu}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Position Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PositionStatus)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="Filled">Filled</option>
                <option value="Vacant">Vacant</option>
                <option value="Under Charge">Under Charge</option>
                <option value="Abolished">Abolished</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Status Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Effective Status Date *
              </label>
              <input
                type="date"
                value={statusDate}
                onChange={(e) => setStatusDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Section: Sanctioning Government Resolution (always available) */}
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-xs font-bold text-indigo-900">
                Sanctioning Government Resolution (GR)
              </h3>
              <a
                href="/gr-repository"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                Open GR Repository →
              </a>
            </div>
            <select
              value={grId || ''}
              onChange={(e) => {
                const selected = grOptions.find((g) => g.id === e.target.value) ?? null;
                handleGrSelect(selected);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">— Not linked to a GR —</option>
              {grOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.grNumber} — {g.title}
                  {g.issueDate ? ` (${g.issueDate})` : ''}
                </option>
              ))}
            </select>
            {grOptions.length === 0 && (
              <span className="block text-[10px] text-slate-500">
                No active GRs found. Add the resolution in the GR Repository first, then link it here.
              </span>
            )}
            {grId &&
              (() => {
                const selected = grOptions.find((g) => g.id === grId);
                return (
                  <div className="rounded border border-indigo-100 bg-white px-3 py-2 text-xs text-indigo-800">
                    <span className="font-bold">Linked GR:</span> {selected?.grNumber || ''}
                    {selected?.storagePath && (
                      <>
                        {' '}
                        <button
                          type="button"
                          onClick={() => {
                            void grDocumentStorage.openDocument(selected.storagePath!).catch((err: unknown) => {
                              setErrorMsg(
                                err instanceof Error ? err.message : 'Could not open the linked GR PDF.'
                              );
                            });
                          }}
                          className="text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
                        >
                          (view PDF)
                        </button>
                      </>
                    )}
                    <span className="block text-[10px] text-slate-500">
                      The same GR can be linked to many posts — stored once, not duplicated.
                    </span>
                  </div>
                );
              })()}
          </div>

          {/* Section: Employee details if Filled */}
          {status === 'Filled' && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  Occupant Employee Information
                </h3>
                {record && record.status === 'Filled' && record.hrpnNo && record.hrpnNo !== '-' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Active Occupant
                  </span>
                )}
              </div>

              {record && record.status === 'Filled' && record.hrpnNo && record.hrpnNo !== '-' && (
                <div className="text-[11px] bg-blue-50 border border-blue-200 rounded-md p-2 text-blue-800 leading-relaxed">
                  <span className="font-bold">Note:</span> This position is currently held by <strong>{record.employeeName || 'an employee'}</strong> (HRPN: {record.hrpnNo}). To reassign it while preserving incumbency history and TDS records, use the <strong>Relieve / Handover</strong> action from the main register, or set the status to Vacant.
                </div>
              )}
              
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    HRPN No.
                  </label>
                  <div className="mt-1">
                    <HrpnLookupInput
                      value={hrpnNo}
                      onChange={setHrpnNo}
                      onPick={handlePrimaryEmployeePick}
                      placeholder="e.g. 20014113"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Employee Name (Gujarati) *
                  </label>
                  <input
                    type="text"
                    value={employeeNameGu}
                    onChange={(e) => setEmployeeNameGu(e.target.value)}
                    placeholder="e.g. સુરેશભાઈ કે. પટેલ"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-gujSans"
                  />
                  <span className="text-[10px] text-slate-500">Gujarati script for statutory reports</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Mobile No.
                  </label>
                  <input
                    type="text"
                    value={mobileNo}
                    onChange={(e) => setMobileNo(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section: Charge employee if Under Charge */}
          {status === 'Under Charge' && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 space-y-3">
              <h3 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                Additional Charge Holder Information
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Charge Employee HRPN No. *
                  </label>
                  <div className="mt-1">
                    <HrpnLookupInput
                      value={chargeHrpnNo}
                      onChange={setChargeHrpnNo}
                      onPick={handleChargeEmployeePick}
                      tone="charge"
                      placeholder="Enter charge HRPN"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Charge Employee Name (Gujarati)
                  </label>
                  <input
                    type="text"
                    value={chargeNameGu}
                    onChange={(e) => setChargeNameGu(e.target.value)}
                    placeholder="e.g. રમેશભાઈ પટેલ"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-gujSans"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section: Resolution details if Abolished/Cancelled */}
          {isResolutionStatus(status) && (
            <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-4 space-y-3">
              <h3 className="text-xs font-bold text-purple-900">
                Abolition / Cancellation Detail *
              </h3>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700">
                  Resolution Note / Reference *
                </label>
                <input
                  type="text"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="e.g. Resolution No. ICDP-1022-EST, Dated 01-04-2024"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {grId ? (
                <p className="text-[11px] text-purple-800">
                  The resolution PDF is provided by the linked GR above (stored once, not duplicated).
                </p>
              ) : (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700">
                    Resolution PDF Attachment (&le; 2MB)
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                      <Upload className="h-3.5 w-3.5" />
                      <span>{pdfUploading ? 'Uploading...' : 'Choose PDF'}</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handlePdfUpload}
                        disabled={pdfUploading}
                        className="hidden"
                      />
                    </label>
                    {resolutionPdfUrl && (
                      <a
                        href={resolutionPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>View Attached PDF</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Additional remarks..."
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Footer actions (sticky on mobile) */}
          <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 pb-safe pt-3 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || pdfUploading}
              className="inline-flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
            >
              <Check className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Position'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
