import { useState, useMemo } from 'react';
import {
  Edit2,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Code2,
  Search,
  Check,
  X,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import { MappingStatusBadge } from './MappingStatusBadge';
import type { PayBillExtractedRecord, PayBillEmployeeRow } from '../types';

interface ExtractionPreviewTableProps {
  records: PayBillExtractedRecord[];
  onUpdateRecord: (id: string, updatedFields: Partial<PayBillEmployeeRow>) => void;
  onDeleteRecord: (id: string) => void;
  onQuickAddEmployee?: (row: PayBillEmployeeRow) => Promise<void> | void;
  onSyncMasterPayScale?: (empId: string, updates: { designation?: string; payScale?: string }) => Promise<void> | void;
}

export function ExtractionPreviewTable({
  records,
  onUpdateRecord,
  onDeleteRecord,
  onQuickAddEmployee,
  onSyncMasterPayScale,
}: ExtractionPreviewTableProps) {
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<PayBillEmployeeRow | null>(null);
  const [normalizedViewRecord, setNormalizedViewRecord] = useState<PayBillExtractedRecord | null>(null);

  const formatInr = (n: number | undefined) =>
    `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

  const hasSpecialPay = useMemo(() => records.some((r) => (r.row.specialPay || 0) > 0), [records]);
  const hasWashing = useMemo(() => records.some((r) => (r.row.washingAllowance || 0) > 0), [records]);
  const hasNpp = useMemo(
    () => records.some((r) => (r.row.nonPrivatePracticeAllowance || 0) > 0) || (!hasSpecialPay && !hasWashing),
    [records, hasSpecialPay, hasWashing]
  );

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Filter tab
      if (filter === 'MATCHED' && rec.mappingStatus !== 'MATCHED') return false;
      if (filter === 'NOT_FOUND' && rec.mappingStatus !== 'NOT_FOUND') return false;
      if (filter === 'DUPLICATE' && rec.mappingStatus !== 'DUPLICATE') return false;
      if (filter === 'ERRORS' && rec.errors.length === 0 && rec.mappingStatus !== 'INVALID_HRPN') return false;

      // Search term
      if (search.trim()) {
        const q = search.toLowerCase();
        const hrpnMatch = rec.row.hrpn.toLowerCase().includes(q);
        const nameMatch = rec.row.employeeName.toLowerCase().includes(q);
        const desigMatch = rec.row.designation.toLowerCase().includes(q);
        const payScaleMatch = (rec.row.payScale || '').toLowerCase().includes(q);
        const masterMatch = rec.matchedEmployee?.name.toLowerCase().includes(q);
        return hrpnMatch || nameMatch || desigMatch || payScaleMatch || !!masterMatch;
      }

      return true;
    });
  }, [records, filter, search]);

  const handleStartEdit = (rec: PayBillExtractedRecord) => {
    setEditingRecordId(rec.id);
    setEditFormData({ ...rec.row });
  };

  const handleSaveEdit = () => {
    if (editingRecordId && editFormData) {
      onUpdateRecord(editingRecordId, editFormData);
      setEditingRecordId(null);
      setEditFormData(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingRecordId(null);
    setEditFormData(null);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
      {/* Table Toolbar */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'ALL', label: 'All Records', count: records.length },
            {
              id: 'MATCHED',
              label: 'Matched',
              count: records.filter((r) => r.mappingStatus === 'MATCHED').length,
            },
            {
              id: 'NOT_FOUND',
              label: 'Not Found',
              count: records.filter((r) => r.mappingStatus === 'NOT_FOUND').length,
            },
            {
              id: 'DUPLICATE',
              label: 'Duplicate',
              count: records.filter((r) => r.mappingStatus === 'DUPLICATE').length,
            },
            {
              id: 'ERRORS',
              label: 'Errors',
              count: records.filter((r) => r.errors.length > 0 || r.mappingStatus === 'INVALID_HRPN').length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 shrink-0 ${
                filter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[0.68rem] ${
                  filter === tab.id
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search HRPN or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto max-h-[540px] app-scroll">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 sticky top-0 z-10 shadow-sm">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="py-2.5 px-3 font-semibold text-center w-12">Sr.</th>
              <th className="py-2.5 px-3 font-semibold">HRPN (Key)</th>
              <th className="py-2.5 px-3 font-semibold min-w-[180px]">Employee Name</th>
              <th className="py-2.5 px-3 font-semibold min-w-[130px]">Designation</th>
              <th className="py-2.5 px-3 font-semibold min-w-[140px]">Pay Scale</th>
              <th className="py-2.5 px-3 font-semibold text-right">Basic Pay</th>
              <th className="py-2.5 px-3 font-semibold text-right">DA</th>
              <th className="py-2.5 px-3 font-semibold text-right">HRA</th>
              <th className="py-2.5 px-3 font-semibold text-right">CLA</th>
              <th className="py-2.5 px-3 font-semibold text-right">Med.</th>
              <th className="py-2.5 px-3 font-semibold text-right">Trans.</th>
              {hasSpecialPay && <th className="py-2.5 px-3 font-semibold text-right">Spl. Pay</th>}
              {hasWashing && <th className="py-2.5 px-3 font-semibold text-right">Washing</th>}
              {hasNpp && <th className="py-2.5 px-3 font-semibold text-right">NPP</th>}
              <th className="py-2.5 px-3 font-semibold text-right bg-blue-50/50 dark:bg-blue-950/30">
                Gross Amount
              </th>
              <th className="py-2.5 px-3 font-semibold text-center">Mapping</th>
              <th className="py-2.5 px-3 font-semibold text-center">Status</th>
              <th className="py-2.5 px-3 font-semibold text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={17} className="py-8 text-center text-slate-400 dark:text-slate-500">
                  No records match the selected filter.
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => {
                const isEditing = editingRecordId === rec.id;
                const hasErrors = rec.errors.length > 0;
                const hasWarnings = rec.warnings.length > 0;

                return (
                  <tr
                    key={rec.id}
                    className={`hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-colors ${
                      hasErrors ? 'bg-red-50/20 dark:bg-red-950/10' : ''
                    }`}
                  >
                    {/* Sr No */}
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">
                      {rec.row.srNo || '-'}
                    </td>

                    {/* HRPN */}
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-700 dark:text-blue-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData?.hrpn || ''}
                          onChange={(e) =>
                            setEditFormData((prev) => prev && { ...prev, hrpn: e.target.value })
                          }
                          className="w-24 px-1.5 py-0.5 text-xs border rounded bg-white dark:bg-slate-800 border-blue-500 font-mono"
                        />
                      ) : (
                        rec.row.hrpn
                      )}
                    </td>

                    {/* Employee Name */}
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData?.employeeName || ''}
                          onChange={(e) =>
                            setEditFormData((prev) => prev && { ...prev, employeeName: e.target.value })
                          }
                          className="w-full px-1.5 py-0.5 text-xs border rounded bg-white dark:bg-slate-800 border-blue-500 font-semibold"
                        />
                      ) : (
                        <div>
                          <div className="font-semibold">{rec.row.employeeName}</div>
                          {rec.matchedEmployee && rec.nameMismatch && (
                            <div className="text-[0.68rem] text-amber-600 dark:text-amber-400 font-normal mt-0.5">
                              Master: {rec.matchedEmployee.name}
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Designation */}
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData?.designation || ''}
                          onChange={(e) =>
                            setEditFormData((prev) => prev && { ...prev, designation: e.target.value })
                          }
                          className="w-full px-1.5 py-0.5 text-xs border rounded bg-white dark:bg-slate-800 border-blue-500"
                        />
                      ) : (
                        <span className="font-medium">{rec.row.designation || 'Staff'}</span>
                      )}
                    </td>

                    {/* Pay Scale */}
                    <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400 font-mono text-[0.72rem]">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editFormData?.payScale || ''}
                          onChange={(e) =>
                            setEditFormData((prev) => prev && { ...prev, payScale: e.target.value })
                          }
                          className="w-full px-1.5 py-0.5 text-xs border rounded bg-white dark:bg-slate-800 border-blue-500 font-mono text-[0.7rem]"
                        />
                      ) : (
                        rec.row.payScale ? (
                          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                            {rec.row.payScale}
                          </span>
                        ) : (
                          '-'
                        )
                      )}
                    </td>

                    {/* Basic Pay */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-800 dark:text-slate-200">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFormData?.basicPay || 0}
                          onChange={(e) =>
                            setEditFormData((prev) => prev && { ...prev, basicPay: parseFloat(e.target.value) || 0 })
                          }
                          className="w-20 px-1 py-0.5 text-xs text-right border rounded bg-white dark:bg-slate-800 border-blue-500"
                        />
                      ) : (
                        formatInr(rec.row.basicPay)
                      )}
                    </td>

                    {/* DA */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFormData?.da || 0}
                          onChange={(e) =>
                            setEditFormData((prev) => prev && { ...prev, da: parseFloat(e.target.value) || 0 })
                          }
                          className="w-20 px-1 py-0.5 text-xs text-right border rounded bg-white dark:bg-slate-800 border-blue-500"
                        />
                      ) : (
                        formatInr(rec.row.da)
                      )}
                    </td>

                    {/* HRA */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFormData?.hra || 0}
                          onChange={(e) =>
                            setEditFormData((prev) => prev && { ...prev, hra: parseFloat(e.target.value) || 0 })
                          }
                          className="w-16 px-1 py-0.5 text-xs text-right border rounded bg-white dark:bg-slate-800 border-blue-500"
                        />
                      ) : (
                        formatInr(rec.row.hra)
                      )}
                    </td>

                    {/* CLA */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFormData?.cla || 0}
                          onChange={(e) =>
                            setEditFormData((prev) => prev && { ...prev, cla: parseFloat(e.target.value) || 0 })
                          }
                          className="w-14 px-1 py-0.5 text-xs text-right border rounded bg-white dark:bg-slate-800 border-blue-500"
                        />
                      ) : (
                        formatInr(rec.row.cla)
                      )}
                    </td>

                    {/* Medical */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFormData?.medicalAllowance || 0}
                          onChange={(e) =>
                            setEditFormData((prev) => prev && { ...prev, medicalAllowance: parseFloat(e.target.value) || 0 })
                          }
                          className="w-16 px-1 py-0.5 text-xs text-right border rounded bg-white dark:bg-slate-800 border-blue-500"
                        />
                      ) : (
                        formatInr(rec.row.medicalAllowance)
                      )}
                    </td>

                    {/* Transport */}
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFormData?.transportAllowance || 0}
                          onChange={(e) =>
                            setEditFormData((prev) => prev && { ...prev, transportAllowance: parseFloat(e.target.value) || 0 })
                          }
                          className="w-16 px-1 py-0.5 text-xs text-right border rounded bg-white dark:bg-slate-800 border-blue-500"
                        />
                      ) : (
                        formatInr(rec.row.transportAllowance)
                      )}
                    </td>

                    {/* Special Pay (if applicable) */}
                    {hasSpecialPay && (
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editFormData?.specialPay || 0}
                            onChange={(e) =>
                              setEditFormData((prev) => prev && { ...prev, specialPay: parseFloat(e.target.value) || 0 })
                            }
                            className="w-16 px-1 py-0.5 text-xs text-right border rounded bg-white dark:bg-slate-800 border-blue-500"
                          />
                        ) : (
                          formatInr(rec.row.specialPay)
                        )}
                      </td>
                    )}

                    {/* Washing (if applicable) */}
                    {hasWashing && (
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editFormData?.washingAllowance || 0}
                            onChange={(e) =>
                              setEditFormData((prev) => prev && { ...prev, washingAllowance: parseFloat(e.target.value) || 0 })
                            }
                            className="w-16 px-1 py-0.5 text-xs text-right border rounded bg-white dark:bg-slate-800 border-blue-500"
                          />
                        ) : (
                          formatInr(rec.row.washingAllowance)
                        )}
                      </td>
                    )}

                    {/* NPP (if applicable) */}
                    {hasNpp && (
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700 dark:text-slate-300">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editFormData?.nonPrivatePracticeAllowance || 0}
                            onChange={(e) =>
                              setEditFormData((prev) => prev && { ...prev, nonPrivatePracticeAllowance: parseFloat(e.target.value) || 0 })
                            }
                            className="w-18 px-1 py-0.5 text-xs text-right border rounded bg-white dark:bg-slate-800 border-blue-500"
                          />
                        ) : (
                          formatInr(rec.row.nonPrivatePracticeAllowance)
                        )}
                      </td>
                    )}

                    {/* Gross Amount */}
                    <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900 dark:text-slate-100 bg-blue-50/30 dark:bg-blue-950/20">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editFormData?.grossAmount || 0}
                          onChange={(e) =>
                            setEditFormData((prev) => prev && { ...prev, grossAmount: parseFloat(e.target.value) || 0 })
                          }
                          className="w-22 px-1 py-0.5 text-xs text-right font-bold border rounded bg-white dark:bg-slate-800 border-blue-500"
                        />
                      ) : (
                        formatInr(rec.row.grossAmount)
                      )}
                    </td>

                    {/* Mapping Badge */}
                    <td className="py-2.5 px-3 text-center">
                      <MappingStatusBadge
                        status={rec.mappingStatus}
                        nameMismatch={rec.nameMismatch}
                        message={rec.mappingMessage}
                      />
                    </td>

                    {/* Validation Status */}
                    <td className="py-2.5 px-3 text-center">
                      {hasErrors ? (
                        <span
                          title={rec.errors.join(' | ')}
                          className="inline-flex items-center gap-1 text-[0.7rem] bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 px-2 py-0.5 rounded-full font-bold cursor-help"
                        >
                          <AlertCircle className="w-3 h-3 text-red-600" /> Error
                        </span>
                      ) : hasWarnings ? (
                        <span
                          title={rec.warnings.join(' | ')}
                          className="inline-flex items-center gap-1 text-[0.7rem] bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full font-medium cursor-help"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-500" /> Warn
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[0.7rem] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                          <Check className="w-3 h-3 text-emerald-600" /> OK
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={handleSaveEdit}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Save"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {rec.mappingStatus === 'NOT_FOUND' && onQuickAddEmployee && (
                            <button
                              onClick={() => onQuickAddEmployee(rec.row)}
                              className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition-colors"
                              title="Quick-Add to Master Employees"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {rec.matchedEmployee && (rec.nameMismatch || rec.row.designation !== rec.matchedEmployee.designation) && onSyncMasterPayScale && (
                            <button
                              onClick={() =>
                                onSyncMasterPayScale(rec.matchedEmployee!.id, {
                                  designation: rec.row.designation,
                                  payScale: rec.row.payScale,
                                })
                              }
                              className="p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition-colors"
                              title="Sync latest Pay Scale / Designation to Master"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleStartEdit(rec)}
                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Edit Values"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setNormalizedViewRecord(rec)}
                            className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-slate-800 rounded transition-colors"
                            title="View Normalized HRPN String"
                          >
                            <Code2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteRecord(rec.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Normalized String Dialog Modal */}
      {normalizedViewRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Normalized HRPN-Based Representation
                </h3>
              </div>
              <button
                onClick={() => setNormalizedViewRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Derived normalized string for consistent employee paybill reference across modules:
            </p>

            <div className="bg-slate-950 text-emerald-400 p-3 rounded-xl font-mono text-xs break-all select-all border border-slate-800">
              {normalizedViewRecord.normalizedString}
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <div><b>HRPN Key:</b> {normalizedViewRecord.row.hrpn}</div>
              <div><b>Employee:</b> {normalizedViewRecord.row.employeeName}</div>
              <div><b>Gross:</b> {formatInr(normalizedViewRecord.row.grossAmount)}</div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setNormalizedViewRecord(null)}
                className="px-4 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
