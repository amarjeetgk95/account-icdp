import { useState } from 'react';
import { useFinancialYear } from '../hooks/useFinancialYear';

export function FinancialYearForm() {
  const { currentYear, isLoading, changeYearAsync } = useFinancialYear();
  const [newYear, setNewYear] = useState<number | ''>('');
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newYear || isNaN(newYear) || newYear < 2000 || newYear > 2100) {
      setSubmitStatus({ type: 'error', message: 'Please enter a valid 4-digit year (2000-2100).' });
      return;
    }

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    try {
      setSubmitStatus({ type: 'info', message: 'Updating financial year...' });
      await changeYearAsync(newYear);
      setSubmitStatus({
        type: 'success',
        message: `Financial year updated to ${newYear}. Previous year data preserved.`,
      });
      setShowConfirm(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to change financial year';
      setSubmitStatus({ type: 'error', message });
      setShowConfirm(false);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentYearLabel = currentYear ? `${currentYear}-${(currentYear as number) + 1}` : '-';
  const suggestedYear = currentYear ? (currentYear as number) + 1 : '';

  return (
    <div className="space-y-4">
      <p className="text-slate-600">
        Change the current financial year the system works in. All previously entered
        salary and vendor data is <strong>kept and preserved</strong> — nothing is deleted.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="currentFY" className="label">
              Current Financial Year
            </label>
            <input
              id="currentFY"
              type="text"
              value={currentYearLabel}
              disabled
              className="input bg-slate-50"
            />
          </div>

          <div>
            <label htmlFor="newFY" className="label">
              New Financial Year
            </label>
            <input
              id="newFY"
              type="number"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value ? parseInt(e.target.value, 10) : '')}
              className="input"
              placeholder={`Enter year (e.g., ${suggestedYear})`}
              min={2000}
              max={2100}
            />
          </div>

          <div>
            <button type="submit" className="btn btn-primary">
              {showConfirm ? 'Confirm Change' : 'Change Financial Year'}
            </button>
          </div>
        </div>

        {showConfirm && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-800 font-medium mb-2">
              Are you sure you want to change the financial year to {newYear}-{Number(newYear) + 1}?
            </p>
            <p className="text-amber-700 text-sm mb-3">
              All existing salary and vendor data will be kept. Nothing is deleted.
            </p>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                Yes, Change Financial Year
              </button>
              <button type="button" onClick={handleCancel} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}

        {submitStatus && !showConfirm && (
          <div
            className={`px-4 py-2 rounded-lg ${
              submitStatus.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : submitStatus.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {submitStatus.message}
          </div>
        )}
      </form>
    </div>
  );
}
