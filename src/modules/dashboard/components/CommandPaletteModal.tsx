import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  Search,
  Banknote,
  FileSpreadsheet,
  Store,
  Settings,
  RefreshCw,
  UserCheck,
  Sparkles,
  X,
  CreditCard,
  FileText,
  User,
  Hash,
  FilePlus2,
} from 'lucide-react';

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSalaryLookup: (query: string) => void;
  onRefresh?: () => void;
}

export function CommandPaletteModal({
  isOpen,
  onClose,
  onSelectSalaryLookup,
  onRefresh,
}: CommandPaletteModalProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleClose = useCallback(() => {
    setSearchQuery('');
    onClose();
  }, [onClose]);

  // Escape closes the modal (Ctrl+K is handled globally in App)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Lock body scroll when modal is active
  useEffect(() => {
    if (!isOpen) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
      handleClose();
    },
    [navigate, handleClose]
  );

  const handleLookup = useCallback(
    (query: string) => {
      onSelectSalaryLookup(query);
      handleClose();
    },
    [onSelectSalaryLookup, handleClose]
  );

  const handleRefreshData = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
    handleClose();
  }, [onRefresh, handleClose]);

  if (!isOpen) return null;

  const trimmedQuery = searchQuery.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24 bg-slate-950/60 backdrop-blur-md transition-opacity"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Global Command Palette"
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 shadow-[0_0_50px_rgba(0,0,0,0.6)] transition-transform"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          label="Global Command Palette"
          className="w-full bg-slate-900 text-slate-100 flex flex-col font-sans"
        >
          {/* Header & Search Bar */}
          <div className="relative flex items-center border-b border-slate-800/80 px-4 py-3.5 gap-3 bg-slate-900/90">
            <Search className="w-5 h-5 text-indigo-400 shrink-0" />
            <Command.Input
              value={searchQuery}
              onValueChange={setSearchQuery}
              placeholder="Type a command or search (HRPN, PAN, Name, 24Q, 26Q)..."
              className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm sm:text-base focus:outline-none border-none ring-0 outline-none"
              autoFocus
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-medium text-slate-400 bg-slate-800 border border-slate-700/80 rounded shadow-sm">
                ESC
              </kbd>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close command palette"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Command Options List */}
          <Command.List className="max-h-[360px] overflow-y-auto p-2 space-y-2">
            <Command.Empty className="py-10 text-center text-sm text-slate-400 flex flex-col items-center justify-center gap-2">
              <div className="w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500 border border-slate-700/50">
                <Search className="w-5 h-5" />
              </div>
              <p className="font-medium text-slate-300">
                No commands found matching &quot;{searchQuery}&quot;
              </p>
              {trimmedQuery && (
                <button
                  type="button"
                  onClick={() => handleLookup(trimmedQuery)}
                  className="mt-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Perform Lookup for &quot;{trimmedQuery}&quot;
                </button>
              )}
            </Command.Empty>

            {/* Dynamic Search Query Action */}
            {trimmedQuery.length > 0 && (
              <Command.Group
                heading="Active Search"
                className="px-1 py-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-extrabold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-indigo-400"
              >
                <Command.Item
                  value={`Search Salary Lookup for ${trimmedQuery}`}
                  keywords={[
                    trimmedQuery.toLowerCase(),
                    'hrpn',
                    'pan',
                    'name',
                    'salary',
                    'lookup',
                  ]}
                  onSelect={() => handleLookup(trimmedQuery)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-all data-[selected=true]:bg-indigo-600/25 data-[selected=true]:text-white data-[selected=true]:border data-[selected=true]:border-indigo-500/40 select-none my-1 group border border-transparent"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                      <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-100 group-hover:text-white flex items-center gap-2">
                        Search Employee Lookup
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                          {trimmedQuery}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Query salary record &amp; breakdown for &quot;
                        {trimmedQuery}&quot;
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="text-xs font-medium text-indigo-300">
                      Select
                    </span>
                    <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">
                      ↵
                    </kbd>
                  </div>
                </Command.Item>
              </Command.Group>
            )}

            {/* Navigation Group */}
            <Command.Group
              heading="Navigation"
              className="px-1 py-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-extrabold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400"
            >
              <Command.Item
                value="Go to Payroll Sheet"
                keywords={[
                  'payroll',
                  'salary',
                  'sheet',
                  'hrpn',
                  'roster',
                  'pay',
                  'wages',
                ]}
                onSelect={() => handleNavigate('/payroll')}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-all data-[selected=true]:bg-indigo-600/25 data-[selected=true]:text-white data-[selected=true]:border data-[selected=true]:border-indigo-500/40 select-none my-1 group border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100 group-hover:text-white flex items-center gap-2">
                      Go to Payroll Sheet
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-indigo-300 border border-slate-700/60">
                        /payroll
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Manage employee salary entries, HRPN records &amp; wages
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100 transition-opacity text-slate-400">
                  <span className="text-xs">Go</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">
                    ↵
                  </kbd>
                </div>
              </Command.Item>

              <Command.Item
                value="Go to Form 24Q Reports"
                keywords={[
                  '24q',
                  'reports',
                  'form 24q',
                  'tds',
                  'quarterly',
                  'return',
                  'fvu',
                ]}
                onSelect={() => handleNavigate('/reports')}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-all data-[selected=true]:bg-indigo-600/25 data-[selected=true]:text-white data-[selected=true]:border data-[selected=true]:border-indigo-500/40 select-none my-1 group border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 group-hover:scale-105 transition-transform shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100 group-hover:text-white flex items-center gap-2">
                      Go to Form 24Q Reports
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-teal-300 border border-slate-700/60">
                        /reports
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Quarterly TDS return reports, FVU generation &amp; summary
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100 transition-opacity text-slate-400">
                  <span className="text-xs">Go</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">
                    ↵
                  </kbd>
                </div>
              </Command.Item>

              <Command.Item
                value="Go to Vendor 26Q Report"
                keywords={[
                  '26q',
                  'parties',
                  'vendor',
                  'vendor 26q',
                  'party',
                  'bill',
                  'pan',
                ]}
                onSelect={() => handleNavigate('/parties')}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-all data-[selected=true]:bg-indigo-600/25 data-[selected=true]:text-white data-[selected=true]:border data-[selected=true]:border-indigo-500/40 select-none my-1 group border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100 group-hover:text-white flex items-center gap-2">
                      Go to Vendor 26Q Report
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-amber-300 border border-slate-700/60">
                        /parties
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Vendor deductor profiles, 26Q party entries &amp; bills
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100 transition-opacity text-slate-400">
                  <span className="text-xs">Go</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">
                    ↵
                  </kbd>
                </div>
              </Command.Item>

              <Command.Item
                value="Go to Office Settings"
                keywords={[
                  'settings',
                  'office',
                  'tan',
                  'configuration',
                  'deductor',
                  'profile',
                ]}
                onSelect={() => handleNavigate('/settings')}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-all data-[selected=true]:bg-indigo-600/25 data-[selected=true]:text-white data-[selected=true]:border data-[selected=true]:border-indigo-500/40 select-none my-1 group border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform shrink-0">
                    <Settings className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100 group-hover:text-white flex items-center gap-2">
                      Go to Office Settings
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-purple-300 border border-slate-700/60">
                        /settings
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Configure office info, TAN registration &amp; defaults
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100 transition-opacity text-slate-400">
                  <span className="text-xs">Go</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">
                    ↵
                  </kbd>
                </div>
              </Command.Item>
            </Command.Group>

            {/* Actions Group */}
            <Command.Group
              heading="Actions"
              className="px-1 py-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-extrabold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400"
            >
              <Command.Item
                value="Create New GTR-44 Bill"
                keywords={[
                  'create',
                  'new',
                  'bill',
                  'gtr44',
                  'contingent',
                  'expense',
                  'draft',
                ]}
                onSelect={() => handleNavigate('/gtr44/create')}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-all data-[selected=true]:bg-indigo-600/25 data-[selected=true]:text-white data-[selected=true]:border data-[selected=true]:border-indigo-500/40 select-none my-1 group border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                    <FilePlus2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100 group-hover:text-white flex items-center gap-2">
                      Create New GTR-44 Bill
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-indigo-300 border border-slate-700/60">
                        /gtr44/create
                      </span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Start a new Detailed Contingent Bill draft
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100 transition-opacity text-slate-400">
                  <span className="text-xs">Go</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">
                    ↵
                  </kbd>
                </div>
              </Command.Item>

              <Command.Item
                value="Export 24Q Report"
                keywords={[
                  'export',
                  '24q',
                  'quarterly',
                  'report',
                  'tds',
                  'excel',
                  'filing',
                ]}
                onSelect={() => handleNavigate('/payroll?tab=report')}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-all data-[selected=true]:bg-indigo-600/25 data-[selected=true]:text-white data-[selected=true]:border data-[selected=true]:border-indigo-500/40 select-none my-1 group border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100 group-hover:text-white flex items-center gap-2">
                      Export 24Q Report
                    </div>
                    <div className="text-xs text-slate-400">
                      Generate quarterly TDS (24Q) statements for filing
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100 transition-opacity text-slate-400">
                  <span className="text-xs">Go</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">
                    ↵
                  </kbd>
                </div>
              </Command.Item>

              <Command.Item
                value="Go to Salary Entry"
                keywords={[
                  'salary',
                  'entry',
                  'payroll',
                  'grid',
                  'monthly',
                  'current',
                  'month',
                ]}
                onSelect={() => handleNavigate('/payroll')}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-all data-[selected=true]:bg-indigo-600/25 data-[selected=true]:text-white data-[selected=true]:border data-[selected=true]:border-indigo-500/40 select-none my-1 group border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform shrink-0">
                    <Banknote className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100 group-hover:text-white flex items-center gap-2">
                      Go to Salary Entry
                    </div>
                    <div className="text-xs text-slate-400">
                      Open the monthly salary grid for the current month
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100 transition-opacity text-slate-400">
                  <span className="text-xs">Go</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">
                    ↵
                  </kbd>
                </div>
              </Command.Item>

              <Command.Item
                value="Executive Employee Lookup"
                keywords={[
                  'executive',
                  'employee',
                  'lookup',
                  'hrpn',
                  'pan',
                  'name',
                  'salary',
                  'search',
                ]}
                onSelect={() => handleLookup(trimmedQuery)}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-all data-[selected=true]:bg-indigo-600/25 data-[selected=true]:text-white data-[selected=true]:border data-[selected=true]:border-indigo-500/40 select-none my-1 group border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100 group-hover:text-white flex items-center gap-2">
                      Executive Employee Lookup
                    </div>
                    <div className="text-xs text-slate-400">
                      Open employee salary breakdown modal by HRPN, PAN or Name
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100 transition-opacity text-slate-400">
                  <span className="text-xs">Run</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">
                    ↵
                  </kbd>
                </div>
              </Command.Item>

              <Command.Item
                value="Refresh Dashboard Data"
                keywords={[
                  'refresh',
                  'reload',
                  'dashboard',
                  'data',
                  'update',
                  'sync',
                ]}
                onSelect={handleRefreshData}
                className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-slate-200 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-all data-[selected=true]:bg-indigo-600/25 data-[selected=true]:text-white data-[selected=true]:border data-[selected=true]:border-indigo-500/40 select-none my-1 group border border-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform shrink-0">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100 group-hover:text-white flex items-center gap-2">
                      Refresh Dashboard Data
                    </div>
                    <div className="text-xs text-slate-400">
                      Reload latest metrics, compliance status &amp; recent logs
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 data-[selected=true]:opacity-100 transition-opacity text-slate-400">
                  <span className="text-xs">Run</span>
                  <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">
                    ↵
                  </kbd>
                </div>
              </Command.Item>
            </Command.Group>

            {/* Quick Shortcuts & Keywords Group */}
            <Command.Group
              heading="Quick Shortcuts &amp; Keywords"
              className="px-1 py-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-extrabold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-400"
            >
              <Command.Item
                value="HRPN Employee Code Shortcut"
                keywords={[
                  'hrpn',
                  'employee',
                  'code',
                  'salary',
                  'lookup',
                  'id',
                ]}
                onSelect={() => handleLookup(trimmedQuery || 'HRPN')}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-all data-[selected=true]:bg-indigo-600/20 data-[selected=true]:text-white select-none my-0.5 group"
              >
                <div className="flex items-center gap-2.5">
                  <Hash className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>
                    Lookup by <strong className="text-indigo-300">HRPN</strong>{' '}
                    Number
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400">
                  HRPN keyword
                </span>
              </Command.Item>

              <Command.Item
                value="PAN Taxpayer Number Shortcut"
                keywords={[
                  'pan',
                  'taxpayer',
                  'permanent',
                  'account',
                  'number',
                  'deductor',
                ]}
                onSelect={() => handleLookup(trimmedQuery || 'PAN')}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-all data-[selected=true]:bg-indigo-600/20 data-[selected=true]:text-white select-none my-0.5 group"
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span>
                    Lookup by <strong className="text-sky-300">PAN</strong>{' '}
                    (Permanent Account Number)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400">
                  PAN keyword
                </span>
              </Command.Item>

              <Command.Item
                value="Employee Name Search Shortcut"
                keywords={[
                  'name',
                  'employee',
                  'search',
                  'first',
                  'last',
                  'person',
                ]}
                onSelect={() => handleLookup(trimmedQuery || 'Name')}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-all data-[selected=true]:bg-indigo-600/20 data-[selected=true]:text-white select-none my-0.5 group"
              >
                <div className="flex items-center gap-2.5">
                  <User className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>
                    Lookup by <strong className="text-teal-300">Name</strong>{' '}
                    (Employee Search)
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400">
                  Name keyword
                </span>
              </Command.Item>

              <Command.Item
                value="Form 24Q Quarterly TDS Shortcut"
                keywords={[
                  '24q',
                  'form 24q',
                  'quarterly',
                  'tds',
                  'return',
                  'statement',
                ]}
                onSelect={() => handleNavigate('/reports')}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-all data-[selected=true]:bg-indigo-600/20 data-[selected=true]:text-white select-none my-0.5 group"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Form <strong className="text-amber-300">24Q</strong>{' '}
                    Quarterly TDS Return Reports
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400">
                  24Q keyword
                </span>
              </Command.Item>

              <Command.Item
                value="Form 26Q Vendor Party Shortcut"
                keywords={[
                  '26q',
                  'form 26q',
                  'vendor',
                  'party',
                  'deductor',
                  'contractor',
                ]}
                onSelect={() => handleNavigate('/parties')}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white cursor-pointer transition-all data-[selected=true]:bg-indigo-600/20 data-[selected=true]:text-white select-none my-0.5 group"
              >
                <div className="flex items-center gap-2.5">
                  <Store className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>
                    Form <strong className="text-rose-300">26Q</strong> Vendor
                    Deductors
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400">
                  26Q keyword
                </span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer Bar & Legend */}
          <div className="border-t border-slate-800/80 bg-slate-950/40 px-4 py-2.5 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300">
                  ↑
                </kbd>
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300">
                  ↓
                </kbd>
                <span className="text-slate-400 ml-0.5">Navigate</span>
              </span>
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300">
                  ↵
                </kbd>
                <span className="text-slate-400 ml-0.5">Select</span>
              </span>
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300">
                  ESC
                </kbd>
                <span className="text-slate-400 ml-0.5">Close</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Command Palette</span>
              <span className="px-1.5 py-0.5 bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 rounded font-mono text-[10px]">
                Ctrl + K
              </span>
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
