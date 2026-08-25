import { useState, useEffect, useMemo } from 'react';
import { useForm16TaxRules } from '@/modules/paybill/hooks/useForm16';
import {
  DEFAULT_TAX_RULES_CONFIG,
  type Form16TaxRulesSettings,
  type AssessmentYearTaxConfig,
  type TaxSlabConfig,
  type SurchargeConfig,
} from '@/modules/paybill/types/form16';
import {
  configToTaxRules,
  taxOnIncome,
  round2,
} from '@/modules/paybill/services/form16Calculation.service';
import { toast } from '@/shared/components/Toast';
import { SkeletonCard } from '@/shared/components/Skeleton';
import {
  Calculator,
  Plus,
  Trash2,
  RotateCcw,
  Save,
  Sparkles,
  Info,
  Calendar,
} from 'lucide-react';

const inr = (n: number | undefined | null) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

export function Form16TaxRulesConfigForm() {
  const { taxRulesConfig, isLoading, saveAsync, isSaving } = useForm16TaxRules();

  const [localConfig, setLocalConfig] = useState<Form16TaxRulesSettings>(DEFAULT_TAX_RULES_CONFIG);
  const [selectedAy, setSelectedAy] = useState<string>('2026-27');
  const [newAyInput, setNewAyInput] = useState<string>('');
  const [showAddAyModal, setShowAddAyModal] = useState<boolean>(false);

  // Live Test Calculator state
  const [testAnnualSalary, setTestAnnualSalary] = useState<number>(1275000);

  useEffect(() => {
    if (taxRulesConfig?.assessmentYears) {
      setLocalConfig({
        ...DEFAULT_TAX_RULES_CONFIG,
        ...taxRulesConfig,
        assessmentYears: {
          ...DEFAULT_TAX_RULES_CONFIG.assessmentYears,
          ...taxRulesConfig.assessmentYears,
        },
      });
      const availableAys = Object.keys({
        ...DEFAULT_TAX_RULES_CONFIG.assessmentYears,
        ...taxRulesConfig.assessmentYears,
      }).sort();
      if (!availableAys.includes(selectedAy) && availableAys.length > 0) {
        setSelectedAy(availableAys[availableAys.length - 1]);
      }
    }
  }, [taxRulesConfig]);

  const currentAyConfig: AssessmentYearTaxConfig = useMemo(() => {
    return (
      localConfig.assessmentYears[selectedAy] ||
      DEFAULT_TAX_RULES_CONFIG.assessmentYears['2026-27']
    );
  }, [localConfig, selectedAy]);

  const updateCurrentAyConfig = (patch: Partial<AssessmentYearTaxConfig>) => {
    setLocalConfig((prev) => ({
      ...prev,
      assessmentYears: {
        ...prev.assessmentYears,
        [selectedAy]: {
          ...currentAyConfig,
          ...patch,
        },
      },
    }));
  };

  const handleAddSlab = () => {
    const slabs = [...currentAyConfig.slabs];
    const last = slabs[slabs.length - 1];
    const newPrevUpto = last ? (last.upto === Infinity ? 2400000 : last.upto) : 0;
    
    // Adjust last slab if it was Infinity
    if (last && last.upto === Infinity) {
      last.upto = newPrevUpto;
    }

    slabs.push({
      id: `s_${Date.now()}`,
      upto: Infinity,
      rate: (last ? last.rate : 0) + 5,
    });

    updateCurrentAyConfig({ slabs });
  };

  const handleRemoveSlab = (idx: number) => {
    if (currentAyConfig.slabs.length <= 1) {
      toast.error('You must keep at least one tax slab.');
      return;
    }
    const slabs = currentAyConfig.slabs.filter((_, i) => i !== idx);
    // Ensure the last slab is Infinity
    if (slabs.length > 0) {
      slabs[slabs.length - 1].upto = Infinity;
    }
    updateCurrentAyConfig({ slabs });
  };

  const handleUpdateSlab = (idx: number, patch: Partial<TaxSlabConfig>) => {
    const slabs = currentAyConfig.slabs.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    updateCurrentAyConfig({ slabs });
  };

  const handleAddSurcharge = () => {
    const surchargeThresholds = [
      ...currentAyConfig.surchargeThresholds,
      {
        id: `sc_${Date.now()}`,
        above: 10000000,
        rate: 10,
      },
    ];
    updateCurrentAyConfig({ surchargeThresholds });
  };

  const handleRemoveSurcharge = (idx: number) => {
    const surchargeThresholds = currentAyConfig.surchargeThresholds.filter((_, i) => i !== idx);
    updateCurrentAyConfig({ surchargeThresholds });
  };

  const handleUpdateSurcharge = (idx: number, patch: Partial<SurchargeConfig>) => {
    const surchargeThresholds = currentAyConfig.surchargeThresholds.map((sc, i) =>
      i === idx ? { ...sc, ...patch } : sc
    );
    updateCurrentAyConfig({ surchargeThresholds });
  };

  const handleAddNewAy = () => {
    const cleanAy = newAyInput.trim();
    if (!cleanAy || !/^\d{4}-\d{2}$/.test(cleanAy)) {
      toast.error('Please enter a valid Assessment Year format (e.g. 2028-29).');
      return;
    }
    if (localConfig.assessmentYears[cleanAy]) {
      toast.error(`Assessment Year ${cleanAy} already exists.`);
      return;
    }

    // Clone from current selected AY
    const cloned: AssessmentYearTaxConfig = {
      ...currentAyConfig,
      ay: cleanAy,
      slabs: currentAyConfig.slabs.map((s) => ({ ...s, id: `s_${Math.random()}` })),
      surchargeThresholds: currentAyConfig.surchargeThresholds.map((sc) => ({ ...sc, id: `sc_${Math.random()}` })),
    };

    setLocalConfig((prev) => ({
      ...prev,
      assessmentYears: {
        ...prev.assessmentYears,
        [cleanAy]: cloned,
      },
    }));
    setSelectedAy(cleanAy);
    setNewAyInput('');
    setShowAddAyModal(false);
    toast.success(`Added Assessment Year ${cleanAy}.`);
  };

  const handleResetToDefaults = () => {
    if (window.confirm(`Reset tax rules for AY ${selectedAy} to statutory Finance Act defaults?`)) {
      const defaultAyConfig = DEFAULT_TAX_RULES_CONFIG.assessmentYears[selectedAy] || DEFAULT_TAX_RULES_CONFIG.assessmentYears['2026-27'];
      updateCurrentAyConfig(defaultAyConfig);
      toast.info(`Reset AY ${selectedAy} to defaults.`);
    }
  };

  const handleSaveAll = async () => {
    try {
      await saveAsync(localConfig);
      toast.success(`Tax rules and slab configuration saved successfully.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save tax rules.');
    }
  };

  // Test computation using current active configuration
  const testCalculation = useMemo(() => {
    const rules = configToTaxRules(currentAyConfig);
    const gross = Number(testAnnualSalary) || 0;
    const stdDed = Math.min(rules.standardDeduction, gross);
    const taxable = Math.max(0, gross - stdDed);
    const rawTax = taxOnIncome(taxable, rules);
    
    let rebate87A = 0;
    if (taxable <= rules.rebate87ALimit && taxable >= rules.basicExemption) {
      rebate87A = Math.min(rawTax, rules.rebate87AMaxAmount);
    }

    let surcharge = 0;
    for (const t of rules.surchargeThresholds) {
      if (taxable > t.above) surcharge = (rawTax * t.rate) / 100;
    }
    surcharge = Math.ceil(surcharge);

    const afterRebate = Math.max(0, rawTax - rebate87A + surcharge);
    const cess = round2(afterRebate * ((rules.cessRate ?? 4) / 100));
    const totalTax = round2(afterRebate + cess);

    return {
      gross,
      stdDed,
      taxable,
      rawTax,
      rebate87A,
      surcharge,
      cess,
      totalTax,
    };
  }, [currentAyConfig, testAnnualSalary]);

  if (isLoading) return <SkeletonCard />;

  const ayKeys = Object.keys(localConfig.assessmentYears).sort();

  return (
    <div className="space-y-6">
      {/* Top Header & AY Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-lg">
              <Calculator size={18} />
            </span>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              New Tax Regime Rules & Slab Engine (u/s 115BAC)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define statutory standard deductions, Section 87A rebate ceilings, and income tax brackets per Assessment Year.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">AY:</span>
            <select
              value={selectedAy}
              onChange={(e) => setSelectedAy(e.target.value)}
              className="bg-transparent text-xs font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none cursor-pointer"
            >
              {ayKeys.map((ay) => (
                <option key={ay} value={ay}>
                  AY {ay}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowAddAyModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition cursor-pointer"
          >
            <Plus size={13} /> Add AY
          </button>

          <button
            type="button"
            onClick={handleResetToDefaults}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Reset this AY to statutory Finance Act standards"
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
      </div>

      {/* Add AY Modal / Form */}
      {showAddAyModal && (
        <div className="p-4 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              Add New Assessment Year
            </h4>
            <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
              When Finance Ministry passes a new budget, enter the new AY (e.g. 2028-29). It will clone current AY rules as starting template.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newAyInput}
              onChange={(e) => setNewAyInput(e.target.value)}
              placeholder="2028-29"
              className="w-28 px-2.5 py-1.5 text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-indigo-300 dark:border-indigo-700 rounded-lg focus:outline-indigo-500"
            />
            <button
              type="button"
              onClick={handleAddNewAy}
              className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition cursor-pointer"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowAddAyModal(false)}
              className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Grid: Exemption Limits & Parameters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Standard Deduction */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 shadow-xs">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Standard Deduction u/s 16(ia)
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-400">₹</span>
            <input
              type="number"
              value={currentAyConfig.standardDeduction}
              onChange={(e) => updateCurrentAyConfig({ standardDeduction: Number(e.target.value) || 0 })}
              className="w-full text-sm font-bold font-mono text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <span className="text-[11px] text-slate-400">Auto-deducted from salary head</span>
        </div>

        {/* Section 87A Rebate Income Ceiling */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 shadow-xs">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Sec 87A Taxable Income Ceiling
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-400">₹</span>
            <input
              type="number"
              value={currentAyConfig.rebate87ALimit}
              onChange={(e) => updateCurrentAyConfig({ rebate87ALimit: Number(e.target.value) || 0 })}
              className="w-full text-sm font-bold font-mono text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <span className="text-[11px] text-slate-400">Zero tax up to this taxable limit</span>
        </div>

        {/* Max 87A Rebate */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 shadow-xs">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Max 87A Rebate Amount
          </label>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-slate-400">₹</span>
            <input
              type="number"
              value={currentAyConfig.rebate87AMaxAmount}
              onChange={(e) => updateCurrentAyConfig({ rebate87AMaxAmount: Number(e.target.value) || 0 })}
              className="w-full text-sm font-bold font-mono text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <span className="text-[11px] text-slate-400">Max tax deduction eligible</span>
        </div>

        {/* Cess Rate */}
        <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 shadow-xs">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Health & Education Cess
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="0.1"
              value={currentAyConfig.cessRate ?? 4}
              onChange={(e) => updateCurrentAyConfig({ cessRate: Number(e.target.value) || 0 })}
              className="w-full text-sm font-bold font-mono text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-sm font-bold text-slate-500">%</span>
          </div>
          <span className="text-[11px] text-slate-400">Applied on Tax after Rebate</span>
        </div>
      </div>

      {/* Tax Slabs Configuration Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              Tax Slabs & Rates — AY {selectedAy}
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Progressive income tax slabs. The top tier automatically covers all income above the previous ceiling.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddSlab}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 transition cursor-pointer"
          >
            <Plus size={13} /> Add Slab Tier
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4 w-1/3">Income Range (From – To)</th>
                <th className="py-2.5 px-4 w-1/3">Upper Ceiling (₹)</th>
                <th className="py-2.5 px-4 w-1/4">Tax Rate (%)</th>
                <th className="py-2.5 px-4 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {currentAyConfig.slabs.map((slab, idx) => {
                const prevUpto = idx === 0 ? 0 : currentAyConfig.slabs[idx - 1].upto;
                const isHighest = slab.upto === Infinity || idx === currentAyConfig.slabs.length - 1;

                return (
                  <tr key={slab.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-4 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {inr(prevUpto)} &rarr; {isHighest ? 'Above' : inr(slab.upto)}
                    </td>
                    <td className="py-2.5 px-4">
                      {isHighest ? (
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-md">
                          No Upper Limit (Above {inr(prevUpto)})
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-bold">₹</span>
                          <input
                            type="number"
                            value={slab.upto}
                            onChange={(e) =>
                              handleUpdateSlab(idx, { upto: Number(e.target.value) || 0 })
                            }
                            className="w-36 font-mono text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          value={slab.rate}
                          onChange={(e) =>
                            handleUpdateSlab(idx, { rate: Number(e.target.value) || 0 })
                          }
                          className="w-20 font-mono text-xs font-bold text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1 focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className="font-bold text-slate-500">%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveSlab(idx)}
                        disabled={currentAyConfig.slabs.length <= 1}
                        className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-30 transition cursor-pointer"
                        title="Remove slab tier"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Surcharge Thresholds */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">
              High-Net-Worth Surcharge Tiers
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Additional percentage surcharge applicable on taxable income exceeding ₹1 Crore+.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddSurcharge}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <Plus size={12} /> Add Surcharge
          </button>
        </div>

        <div className="p-4 space-y-2">
          {currentAyConfig.surchargeThresholds.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No surcharge tiers configured for this AY.</p>
          ) : (
            currentAyConfig.surchargeThresholds.map((sc, idx) => (
              <div
                key={sc.id || idx}
                className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <span className="text-xs text-slate-600 dark:text-slate-300">Income Above:</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={sc.above}
                    onChange={(e) => handleUpdateSurcharge(idx, { above: Number(e.target.value) || 0 })}
                    className="w-36 font-mono text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1"
                  />
                </div>
                <span className="text-xs text-slate-600 dark:text-slate-300">Surcharge Rate:</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={sc.rate}
                    onChange={(e) => handleUpdateSurcharge(idx, { rate: Number(e.target.value) || 0 })}
                    className="w-16 font-mono text-xs font-bold text-center bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md px-2 py-1"
                  />
                  <span className="font-bold text-slate-500">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveSurcharge(idx)}
                  className="ml-auto p-1 text-slate-400 hover:text-red-500 transition cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Live Interactive Verification & Test Calculator */}
      <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
            <Sparkles size={15} /> Instant Live Rule Verification & Tax Sandbox
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
            Preview calculation with active AY {selectedAy} brackets
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Test Annual Gross Salary:
            </label>
            <div className="flex items-center gap-1">
              <span className="text-slate-400 font-bold">₹</span>
              <input
                type="number"
                step="10000"
                value={testAnnualSalary}
                onChange={(e) => setTestAnnualSalary(Number(e.target.value) || 0)}
                className="w-36 font-mono text-xs font-bold bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 shadow-xs">
            <div>
              <span className="text-slate-400">Std Ded 16(ia): </span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                {inr(testCalculation.stdDed)}
              </span>
            </div>
            <span className="text-slate-300">|</span>
            <div>
              <span className="text-slate-400">Taxable Income: </span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                {inr(testCalculation.taxable)}
              </span>
            </div>
            <span className="text-slate-300">|</span>
            <div>
              <span className="text-slate-400">Raw Slab Tax: </span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                {inr(testCalculation.rawTax)}
              </span>
            </div>
            <span className="text-slate-300">|</span>
            <div>
              <span className="text-slate-400">87A Rebate: </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                -{inr(testCalculation.rebate87A)}
              </span>
            </div>
            <span className="text-slate-300">|</span>
            <div>
              <span className="text-slate-400">Cess ({currentAyConfig.cessRate ?? 4}%): </span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                {inr(testCalculation.cess)}
              </span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="font-bold text-indigo-600 dark:text-indigo-400">
              <span>Net Tax Payable: </span>
              <span className="font-mono text-sm">{inr(testCalculation.totalTax)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Info size={14} /> Changes take effect immediately across all Form-16 calculations in this office.
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-md hover:shadow-lg disabled:opacity-50 transition cursor-pointer"
        >
          <Save size={15} />
          {isSaving ? 'Saving Tax Rules...' : 'Save Tax Rules & Brackets'}
        </button>
      </div>
    </div>
  );
}
