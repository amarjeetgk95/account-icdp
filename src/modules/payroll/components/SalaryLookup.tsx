import { useState, type FormEvent } from 'react';
import { useEmployeeLookupDetails } from '../hooks/useSalaryImport';
import { formatCurrency } from '@/shared/utilities';
import {
  Search,
  Banknote,
  ReceiptText,
  LoaderCircle,
  Wallet,
  X,
  Calendar,
  UserRound,
  CreditCard,
  Building2,
  Clock,
  Sparkles,
  Layers,
  Users,
} from 'lucide-react';

export function SalaryLookup({ fy, initialHrpn }: { fy: number; initialHrpn?: string }) {
  const [searchQuery, setSearchQuery] = useState(initialHrpn || '');
  const [searchedQuery, setSearchedQuery] = useState(initialHrpn || '');
  const [selectedHrpn, setSelectedHrpn] = useState('');

  const enabled = !!searchedQuery.trim();
  const { data: lookupData, isLoading, isFetching } = useEmployeeLookupDetails(
    searchedQuery.trim(),
    fy,
    selectedHrpn || undefined
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSelectedHrpn('');
      setSearchedQuery(searchQuery.trim());
    }
  };

  const info = lookupData?.employeeInfo;
  const totals = lookupData?.totals;
  const quarters = lookupData?.quarters;
  const salaries = lookupData?.salaries || [];
  const matchingEmployees = lookupData?.matchingEmployees || [];

  const quarterMap: Record<string, 'Q1' | 'Q2' | 'Q3' | 'Q4'> = {
    April: 'Q1',
    May: 'Q1',
    June: 'Q1',
    July: 'Q2',
    August: 'Q2',
    September: 'Q2',
    October: 'Q3',
    November: 'Q3',
    December: 'Q3',
    January: 'Q4',
    February: 'Q4',
    March: 'Q4',
  };

  const quarterMonths: Record<'Q1' | 'Q2' | 'Q3' | 'Q4', string> = {
    Q1: 'Apr - Jun',
    Q2: 'Jul - Sep',
    Q3: 'Oct - Dec',
    Q4: 'Jan - Mar',
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
        <div>
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Search size={18} className="text-indigo-600 dark:text-indigo-400" />
            Salary Employee &amp; HRPN Lookup
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Search complete employee details by Name, HRPN, or PAN to view quarter totals (Q1-Q4) &amp; DA &amp; Other history
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg">
          <Calendar size={13} className="text-indigo-500" /> FY {fy}-{String(fy + 1).slice(-2)}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1 flex-1 min-w-[260px]">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            Employee Search (Name, HRPN, or PAN) <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (searchQuery.trim()) {
                    setSelectedHrpn('');
                    setSearchedQuery(searchQuery.trim());
                  }
                }
              }}
              placeholder="Search by employee Name, HRPN, or PAN (e.g. Ramesh, 100123)"
              className="input text-sm w-full pr-8 py-2"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchedQuery('');
                  setSelectedHrpn('');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={!searchQuery.trim() || isLoading}
          className="btn btn-primary text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
        >
          {isLoading ? <LoaderCircle size={14} className="animate-spin" /> : <Search size={14} />}
          Search Employee
        </button>
      </form>

      {/* Multiple Matching Employees Selection Bar */}
      {matchingEmployees.length > 1 && (
        <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Users size={15} className="text-indigo-600 dark:text-indigo-400" />
              Found {matchingEmployees.length} matching employees for &quot;{searchedQuery}&quot;
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              Click an employee to view profile
            </span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {matchingEmployees.map((emp) => {
              const isSelected = (info?.hprnNo || '').toLowerCase() === emp.hprnNo.toLowerCase();
              return (
                <button
                  key={emp.hprnNo}
                  type="button"
                  onClick={() => setSelectedHrpn(emp.hprnNo)}
                  className={
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-2 ' +
                    (isSelected
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600')
                  }
                >
                  <UserRound size={13} />
                  <span className="font-bold">{emp.name}</span>
                  {emp.hprnNo && (
                    <span
                      className={
                        'font-mono text-[10px] px-1.5 py-0.5 rounded ' +
                        (isSelected
                          ? 'bg-indigo-700 text-indigo-100'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400')
                      }
                    >
                      {emp.hprnNo}
                    </span>
                  )}
                  {emp.pan && (
                    <span
                      className={
                        'font-mono text-[10px] ' +
                        (isSelected ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500')
                      }
                    >
                      {emp.pan}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-sm text-slate-500 dark:text-slate-400">
            <LoaderCircle size={24} className="animate-spin text-indigo-600 dark:text-indigo-400" />
            <span>Fetching employee profile and salary history...</span>
          </div>
        ) : enabled && (!info && salaries.every((s) => s.status === 'none')) ? (
          <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
            No employee master or salary records found for &quot;<strong className="font-mono text-slate-800 dark:text-slate-200">{searchedQuery}</strong>&quot; in FY {fy}-{String(fy + 1).slice(-2)}.
          </div>
        ) : !enabled ? (
          <div className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            Enter an employee Name, HRPN number, or PAN above to view complete employee personal information, Q1-Q4 quarterly breakdown, DA &amp; Other allowances, and monthly salary history.
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Employee Personal Information Card */}
            <div className="bg-gradient-to-r from-indigo-50/70 via-slate-50 to-blue-50/40 dark:from-indigo-950/30 dark:via-slate-900 dark:to-blue-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100/70 dark:border-indigo-900/40 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                    <UserRound size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      {info?.name || 'Employee Profile'}
                      <span className="font-mono text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md">
                        HRPN: {info?.hprnNo || searchedQuery}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>Personal Information &amp; Roster Profile</span>
                      <span className="inline-block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                      <span className="font-semibold text-slate-600 dark:text-slate-300">
                        {totals?.monthsWithData || 0} Month(s) with Salary Data
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={
                      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ' +
                      (info?.transferDate
                        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900')
                    }
                  >
                    {info?.transferDate ? 'Transferred' : 'Active Status'}
                  </span>
                  <span
                    className={
                      'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ' +
                      (info?.isRegisteredInMaster
                        ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900'
                        : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700')
                    }
                  >
                    {info?.isRegisteredInMaster ? 'Master Registered' : 'Excel Import Only'}
                  </span>
                </div>
              </div>

              {/* Personal Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
                <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1.5 mb-0.5">
                    <CreditCard size={13} className="text-indigo-500" /> PAN Number
                  </span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {info?.pan ? info.pan.toUpperCase() : 'Not Available'}
                  </span>
                </div>

                <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1.5 mb-0.5">
                    <Clock size={13} className="text-indigo-500" /> Date of Joining (DOJ)
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {info?.joinDate ? new Date(info.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </span>
                </div>

                <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1.5 mb-0.5">
                    <Calendar size={13} className="text-indigo-500" /> Transfer Date
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {info?.transferDate ? new Date(info.transferDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'None (Active Service)'}
                  </span>
                </div>

                <div className="bg-white/80 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                  <span className="text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1.5 mb-0.5">
                    <Building2 size={13} className="text-indigo-500" /> Budget Head
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {info?.budgetHeadCode ? `${info.budgetHeadCode} — ${info.budgetHeadName}` : 'Unassigned'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Annual Summary Stat Cards */}
            <div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Banknote size={14} className="text-indigo-600 dark:text-indigo-400" />
                Annual Financial Totals (FY {fy}-{String(fy + 1).slice(-2)})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 rounded-xl">
                  <span className="text-slate-500 dark:text-slate-400 font-medium block mb-1">Gross Pay</span>
                  <div className="font-extrabold text-base text-slate-800 dark:text-slate-100 tabular-nums">
                    {formatCurrency(totals?.gross || 0)}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-3 rounded-xl">
                  <span className="text-amber-600 dark:text-amber-400 font-medium block mb-1">DA &amp; Other</span>
                  <div className="font-extrabold text-base text-amber-700 dark:text-amber-300 tabular-nums">
                    {formatCurrency(totals?.daAndOther || 0)}
                  </div>
                </div>

                <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 p-3 rounded-xl">
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium block mb-1">Total Gross Salary</span>
                  <div className="font-extrabold text-base text-emerald-800 dark:text-emerald-200 tabular-nums">
                    {formatCurrency(totals?.totalGross || 0)}
                  </div>
                </div>

                <div className="bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3 rounded-xl">
                  <span className="text-rose-700 dark:text-rose-300 font-medium flex items-center gap-1 mb-1">
                    <ReceiptText size={13} /> Total TDS (Tax)
                  </span>
                  <div className="font-extrabold text-base text-rose-800 dark:text-rose-200 tabular-nums">
                    {formatCurrency(totals?.tax || 0)}
                  </div>
                </div>

                <div className="bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900/80 p-3 rounded-xl col-span-2 sm:col-span-1">
                  <span className="text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-1 mb-1">
                    <Wallet size={13} /> Net Disbursed
                  </span>
                  <div className="font-extrabold text-base text-indigo-900 dark:text-indigo-100 tabular-nums">
                    {formatCurrency(totals?.net || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Quarter-wise Summary Section (Q1, Q2, Q3, Q4) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-600 dark:text-indigo-400" />
                  Quarter-wise Summary (Q1 - Q4 Compliance)
                </h4>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  24Q TDS Reporting Periods
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((qKey) => {
                  const q = quarters ? quarters[qKey] : { gross: 0, daAndOther: 0, totalGross: 0, tax: 0, net: 0, monthsWithData: 0 };
                  const isQ1 = qKey === 'Q1';
                  return (
                    <div
                      key={qKey}
                      className={
                        'rounded-xl border p-3.5 space-y-2 transition-all ' +
                        (isQ1
                          ? 'bg-gradient-to-b from-indigo-50/90 to-white dark:from-indigo-950/40 dark:to-slate-900 border-indigo-300 dark:border-indigo-700 shadow-xs ring-1 ring-indigo-500/20'
                          : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700')
                      }
                    >
                      <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/70 pb-2">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={
                              'font-extrabold text-sm px-2 py-0.5 rounded-md ' +
                              (isQ1
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200')
                            }
                          >
                            {qKey}
                          </span>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            ({quarterMonths[qKey]})
                          </span>
                        </div>
                        {isQ1 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded">
                            <Sparkles size={10} /> Highlight
                          </span>
                        )}
                      </div>

                      <div className="space-y-1 pt-1 text-slate-600 dark:text-slate-300">
                        <div className="flex justify-between">
                          <span className="text-slate-400 dark:text-slate-500">Gross Pay:</span>
                          <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{formatCurrency(q.gross)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-amber-600 dark:text-amber-400">DA &amp; Other:</span>
                          <span className="font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                            {formatCurrency(q.daAndOther)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100">
                          <span>Total Salary:</span>
                          <span className="tabular-nums text-indigo-700 dark:text-indigo-300">{formatCurrency(q.totalGross)}</span>
                        </div>
                        <div className="flex justify-between text-rose-600 dark:text-rose-400">
                          <span>TDS (Tax):</span>
                          <span className="font-semibold tabular-nums">{formatCurrency(q.tax)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span>Net Disbursed:</span>
                          <span className="tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(q.net)}</span>
                        </div>
                      </div>

                      <div className="pt-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium text-right">
                        {q.monthsWithData} of 3 months recorded
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Monthly Breakdown Table with DA & Other */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Monthly Salary Breakdown &amp; Component Details
                </h4>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                  12 Months Breakdown
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">
                      <th className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 text-left whitespace-nowrap">Month</th>
                      <th className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 text-right whitespace-nowrap">Gross Pay (₹)</th>
                      <th className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 text-right whitespace-nowrap text-amber-700 dark:text-amber-400">DA &amp; Other (₹)</th>
                      <th className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 text-right whitespace-nowrap text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30">Total Salary (₹)</th>
                      <th className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 text-right whitespace-nowrap text-rose-700 dark:text-rose-400">TDS (₹)</th>
                      <th className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 text-right whitespace-nowrap text-emerald-700 dark:text-emerald-400">Net (₹)</th>
                      <th className="px-3 py-2.5 border-b border-slate-200 dark:border-slate-700 text-center whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaries.map((row) => {
                      const qName = quarterMap[row.month] || 'Q1';
                      const hasData = row.status !== 'none';
                      const isCurrentYear = row.month !== 'January' && row.month !== 'February' && row.month !== 'March';

                      return (
                        <tr
                          key={row.month}
                          className={
                            'border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ' +
                            (hasData ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600')
                          }
                        >
                          <td className="px-3 py-2 font-semibold whitespace-nowrap flex items-center gap-2">
                            <span
                              className={
                                'text-[10px] font-bold px-1.5 py-0.5 rounded ' +
                                (qName === 'Q1'
                                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400')
                              }
                            >
                              {qName}
                            </span>
                            <span>{row.month}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                              FY {isCurrentYear ? String(fy).slice(-2) : String(fy + 1).slice(-2)}
                            </span>
                          </td>
                          {hasData ? (
                            <>
                              <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(row.gross)}</td>
                              <td className="px-3 py-2 text-right tabular-nums font-medium text-amber-700 dark:text-amber-400">
                                {formatCurrency(row.daAndOther)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-bold text-indigo-900 dark:text-indigo-200 bg-indigo-50/30 dark:bg-indigo-950/20">
                                {formatCurrency(row.totalGross)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-rose-700 dark:text-rose-400 font-medium">
                                {formatCurrency(row.tax)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                                {formatCurrency(row.net)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span
                                  className={
                                    'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ' +
                                    (row.status === 'matched'
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900'
                                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-900')
                                  }
                                >
                                  {row.status === 'matched' ? 'Entered' : 'Imported'}
                                </span>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-3 py-2 text-right">—</td>
                              <td className="px-3 py-2 text-right">—</td>
                              <td className="px-3 py-2 text-right bg-indigo-50/20 dark:bg-indigo-950/10">—</td>
                              <td className="px-3 py-2 text-right">—</td>
                              <td className="px-3 py-2 text-right">—</td>
                              <td className="px-3 py-2 text-center text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-600">
                                No entry
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {isFetching && !isLoading && (
                      <tr>
                        <td colSpan={7} className="px-3 py-2.5 text-center text-slate-400 dark:text-slate-500">
                          <LoaderCircle size={14} className="inline animate-spin mr-1.5" /> Refreshing salary data...
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-100 border-t-2 border-slate-200 dark:border-slate-700">
                      <td className="px-3 py-2.5 text-left uppercase tracking-wider text-[10px]">Annual Total</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(totals?.gross || 0)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-amber-700 dark:text-amber-400">{formatCurrency(totals?.daAndOther || 0)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-indigo-900 dark:text-indigo-200 bg-indigo-100/50 dark:bg-indigo-950/50 font-extrabold">{formatCurrency(totals?.totalGross || 0)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-rose-700 dark:text-rose-400">{formatCurrency(totals?.tax || 0)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700 dark:text-emerald-400 font-extrabold">{formatCurrency(totals?.net || 0)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

