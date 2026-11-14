import { Building2, RefreshCw, RotateCcw, ShieldCheck, User } from 'lucide-react';
import type { Form16Certificate } from '../../types/form16';
import {
  form16FieldLabel,
  form16TextInput,
  type Form16CertUpdater,
} from './Form16EditorShared';

interface Form16DetailsSectionProps {
  cert: Form16Certificate;
  updateCert: Form16CertUpdater;
  onAutoFill: () => void;
  isAutoFilling: boolean;
  showLoadFromSettings?: boolean;
  onLoadFromSettings?: () => void;
}

/**
 * Details & Sign tab: certificate identifier + employee profile +
 * deductor details + signatory. Identical in both editors (standardized
 * on the roomier page density). The page-only "Load from Settings"
 * deductor button is covered by optional showLoadFromSettings /
 * onLoadFromSettings props (passed only by the page).
 */
export function Form16DetailsSection({
  cert,
  updateCert,
  onAutoFill,
  isAutoFilling,
  showLoadFromSettings,
  onLoadFromSettings,
}: Form16DetailsSectionProps) {
  const textInput = form16TextInput;
  const fieldLabel = form16FieldLabel;

  return (
    <div className="space-y-4">
      {/* Certificate Identifier */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3">
        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
          <Building2 size={15} className="text-indigo-600" /> Certificate Identifier & Date
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>Certificate Number</label>
            <input
              value={cert.certificateNumber || ''}
              onChange={(e) =>
                updateCert((p) => ({
                  ...p,
                  certificateNumber: e.target.value,
                }))
              }
              className={textInput}
              placeholder="Auto-generated if empty"
            />
          </div>
          <div>
            <label className={fieldLabel}>Issue Date</label>
            <input
              type="date"
              value={cert.issuedAt ? cert.issuedAt.slice(0, 10) : ''}
              onChange={(e) =>
                updateCert((p) => ({
                  ...p,
                  issuedAt: e.target.value,
                }))
              }
              className={textInput}
            />
          </div>
        </div>
      </div>

      {/* Employee Profile */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
            <User size={15} className="text-indigo-600" /> Employee Profile
          </div>
          <button
            type="button"
            disabled={isAutoFilling}
            onClick={() => onAutoFill()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition cursor-pointer"
          >
            <RotateCcw size={12} className={isAutoFilling ? 'animate-spin' : ''} /> Auto-fill from Establishment
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>Full Name</label>
            <input
              value={cert.employee.name}
              onChange={(e) =>
                updateCert((p) => ({
                  ...p,
                  employee: { ...p.employee, name: e.target.value },
                }))
              }
              className={textInput}
            />
          </div>
          <div>
            <label className={fieldLabel}>Designation</label>
            <input
              value={cert.employee.designation}
              onChange={(e) =>
                updateCert((p) => ({
                  ...p,
                  employee: { ...p.employee, designation: e.target.value },
                }))
              }
              className={textInput}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>PAN (Permanent Account No)</label>
            <input
              value={cert.employee.pan}
              onChange={(e) =>
                updateCert((p) => ({
                  ...p,
                  employee: {
                    ...p.employee,
                    pan: String(e.target.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
                  },
                }))
              }
              className={`${textInput} font-mono uppercase`}
              placeholder="ABCDE1234F"
            />
          </div>
          <div>
            <label className={fieldLabel}>HRPN / Employee Code</label>
            <input
              value={cert.employee.hrpn}
              disabled
              className={`${textInput} font-mono bg-slate-100 dark:bg-slate-800 text-slate-500`}
            />
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Employee Residential Address</label>
          <input
            value={cert.employee.address}
            onChange={(e) =>
              updateCert((p) => ({
                ...p,
                employee: { ...p.employee, address: e.target.value },
              }))
            }
            className={textInput}
            placeholder="Employee address as per official records"
          />
        </div>
      </div>

      {/* Deductor Profile */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3">
        <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
            <Building2 size={15} className="text-blue-600" /> Deductor Details
          </div>
          {showLoadFromSettings && onLoadFromSettings && (
            <button
              type="button"
              onClick={onLoadFromSettings}
              className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-pointer transition"
            >
              <RefreshCw size={11} /> Load from Settings
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className={fieldLabel}>Office Name (Deductor)</label>
            <textarea
              value={cert.employer.name}
              onChange={(e) =>
                updateCert((p) => ({
                  ...p,
                  employer: { ...p.employer, name: e.target.value },
                }))
              }
              rows={2}
              className={`${textInput} resize-y min-h-[54px]`}
              placeholder="Office of Deputy Director of Animal Husbandry&#10;ICDP, Surat"
            />
            <p className="text-xs text-slate-400 mt-0.5">Press Enter to add a second line</p>
          </div>
          <div>
            <label className={fieldLabel}>CIT (TDS) Location</label>
            <input
              value={cert.partA.citTds || ''}
              onChange={(e) =>
                updateCert((p) => ({
                  ...p,
                  partA: { ...p.partA, citTds: e.target.value },
                  employer: { ...p.employer, citTds: e.target.value },
                }))
              }
              className={textInput}
              placeholder="CIT(TDS), Surat"
            />
          </div>
        </div>

        <div>
          <label className={fieldLabel}>Deductor Office Address</label>
          <input
            value={cert.employer.address}
            onChange={(e) =>
              updateCert((p) => ({
                ...p,
                employer: { ...p.employer, address: e.target.value },
              }))
            }
            className={textInput}
            placeholder="Jilla Seva Sadan-2, Athwalines, Surat - 395001"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={fieldLabel}>Deductor PAN</label>
            <input
              value={cert.employer.pan}
              onChange={(e) =>
                updateCert((p) => ({
                  ...p,
                  employer: {
                    ...p.employer,
                    pan: String(e.target.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
                  },
                }))
              }
              className={`${textInput} font-mono uppercase`}
            />
          </div>
          <div>
            <label className={fieldLabel}>Deductor TAN</label>
            <input
              value={cert.employer.tan}
              onChange={(e) =>
                updateCert((p) => ({
                  ...p,
                  employer: {
                    ...p.employer,
                    tan: String(e.target.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10),
                  },
                }))
              }
              className={`${textInput} font-mono uppercase`}
            />
          </div>
        </div>
      </div>

      {/* Signatory Profile */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
          <ShieldCheck size={15} className="text-emerald-600" /> Verification & Signatory Officer
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={fieldLabel}>Signatory Name</label>
            <input
              value={cert.signatory.name}
              onChange={(e) =>
                updateCert((p) => ({
                  ...p,
                  signatory: { ...p.signatory, name: e.target.value },
                }))
              }
              className={textInput}
            />
          </div>
          <div>
            <label className={fieldLabel}>Designation</label>
            <input
              value={cert.signatory.designation}
              onChange={(e) =>
                updateCert((p) => ({
                  ...p,
                  signatory: { ...p.signatory, designation: e.target.value },
                }))
              }
              className={textInput}
            />
          </div>
          <div>
            <label className={fieldLabel}>Place</label>
            <input
              value={cert.signatory.place}
              onChange={(e) =>
                updateCert((p) => ({
                  ...p,
                  signatory: { ...p.signatory, place: e.target.value },
                }))
              }
              className={textInput}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
