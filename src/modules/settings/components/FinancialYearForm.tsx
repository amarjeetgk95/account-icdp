import { useState } from 'react';
import { useFinancialYear } from '../hooks/useFinancialYear';

export function FinancialYearForm() {
  const { currentYear, isLoading, changeYearAsync } = useFinancialYear();
  const [newYear, setNewYear] = useState<number | ''>('');
  const [submitStatus, setSubmitStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
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
      setSubmitStatus({ type: 'success', message: 'Updating financial year...' });
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
        <div className="spinner h-8 w-8"></div>
      </div>
    );
  }

  const currentYearLabel = currentYear ? `${currentYear}-${currentYear + 1}` : '-';
  const suggestedYear = currentYear ? currentYear + 1 : '';

  return (
    <div className="space-y-4">
      <p className="text-slate-600">
        Change the current financial year the system works in. All previously entered
        salary and vendor data is <strong>kept and preserved</strong> — nothing is deleted.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor="currentFY" className="label">Current Financial Year</label>
            <input
              id="currentFY"
              type="text"
              value={currentYearLabel}
              disabled
              className="input bg-slate-50"
            />
          </div>

          <div>
            <label htmlFor="newFY" className="label">New Financial Year</label>
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
          <div className="alert alert-warning">
            <p className="font-medium mb-2">
              Are you sure you want to change the financial year to {newYear}-{Number(newYear) + 1}?
            </p>
            <p className="text-sm mb-3">
              All existing salary and vendor data will be kept. Nothing is deleted.
            </p>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary btn-sm">
                Yes, Change Financial Year
              </button>
              <button type="button" onClick={handleCancel} className="btn btn-secondary btn-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        {submitStatus && !showConfirm && (
          <div className={`alert alert-${submitStatus.type === 'success' ? 'success' : 'danger'}`}>
            {submitStatus.message}
          </div>
        )}
      </form>
    </div>
  );
}
