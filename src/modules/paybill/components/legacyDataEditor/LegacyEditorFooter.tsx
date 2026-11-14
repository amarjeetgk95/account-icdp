import { Save } from 'lucide-react';

export interface LegacyEditorFooterProps {
  dirtyRowsSize: number;
  saving: boolean;
  onDiscard: () => void;
  onSaveAll: () => Promise<boolean> | void;
}

/** Floating batch-save bar shown whenever there are unsaved edits. */
export function LegacyEditorFooter({ dirtyRowsSize, saving, onDiscard, onSaveAll }: LegacyEditorFooterProps) {
  return (
    <>
        {/* 4. Floating / Sticky Bottom Batch Save Bar */}
        {dirtyRowsSize > 0 && (
          <footer className="shrink-0 bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-2 shadow-xl border-t border-slate-800 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span className="font-semibold text-amber-300">
                {dirtyRowsSize} parameter{dirtyRowsSize > 1 ? 's' : ''} modified
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onDiscard}
                className="px-3 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={() => void onSaveAll()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                <Save size={13} />
                <span>{saving ? 'Saving...' : 'Save Changes (Ctrl + S)'}</span>
              </button>
            </div>
          </footer>
        )}
    </>
  );
}
