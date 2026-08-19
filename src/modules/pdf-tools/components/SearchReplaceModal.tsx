import React, { useState } from 'react';
import { Search, Replace, X, Check, RefreshCw } from 'lucide-react';
import type { SearchReplaceOptions, SearchReplaceResult } from '../types/spatial.types';

interface SearchReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchReplace: (options: SearchReplaceOptions) => SearchReplaceResult;
  currentPageNumber?: number;
  currentTableId?: string;
}

export const SearchReplaceModal: React.FC<SearchReplaceModalProps> = ({
  isOpen,
  onClose,
  onSearchReplace,
  currentPageNumber = 1,
  currentTableId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [exactMatch, setExactMatch] = useState(false);
  const [scope, setScope] = useState<'all_pages' | 'current_page' | 'current_table'>('all_pages');
  const [lastResult, setLastResult] = useState<SearchReplaceResult | null>(null);

  if (!isOpen) return null;

  const handleExecuteReplace = () => {
    if (!searchQuery.trim()) return;

    const res = onSearchReplace({
      searchQuery: searchQuery.trim(),
      replaceQuery,
      matchCase,
      exactMatch,
      scope,
      targetPageNumber: currentPageNumber,
      targetTableId: currentTableId,
    });

    setLastResult(res);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Replace className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Search and Replace</h3>
              <p className="text-xs text-slate-500">Document-wide or scoped text replacement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Find input */}
          <div className="space-y-1">
            <label className="font-medium text-slate-700 block">Find Text:</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Text to find (e.g. 65,917.0O or Pay Officer)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
            </div>
          </div>

          {/* Replace input */}
          <div className="space-y-1">
            <label className="font-medium text-slate-700 block">Replace With:</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Replacement text (e.g. 65,917.00)"
                value={replaceQuery}
                onChange={(e) => setReplaceQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Replace className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5" />
            </div>
          </div>

          {/* Scope & Match Options */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1">
              <label className="font-medium text-slate-700 block">Scope:</label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as any)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all_pages">Entire Document</option>
                <option value="current_page">Current Page (Page {currentPageNumber})</option>
                <option value="current_table">Current Table Only</option>
              </select>
            </div>

            <div className="space-y-2 pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={matchCase}
                  onChange={(e) => setMatchCase(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Match Case</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={exactMatch}
                  onChange={(e) => setExactMatch(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Exact Cell Match</span>
              </label>
            </div>
          </div>

          {/* Feedback banner */}
          {lastResult && (
            <div
              className={`p-3 rounded-lg flex items-center gap-2 text-xs ${
                lastResult.replacementsMade > 0
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {lastResult.replacementsMade > 0 ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>
                Found {lastResult.matchesFound} match(es). Replaced {lastResult.replacementsMade} cell(s).
                (Locked cells were preserved).
              </span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 font-medium"
          >
            Done
          </button>
          <button
            onClick={handleExecuteReplace}
            disabled={!searchQuery.trim()}
            className="px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
          >
            <Replace className="w-3.5 h-3.5" />
            Replace All
          </button>
        </div>
      </div>
    </div>
  );
};
