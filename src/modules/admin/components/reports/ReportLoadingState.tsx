interface ReportLoadingStateProps {
  label: string;
}

export function ReportLoadingState({ label }: ReportLoadingStateProps) {
  return (
    <div className="card animate-fade-in" role="status" aria-label={label}>
      <div className="card-body space-y-5">
        <div className="flex items-center gap-3">
          <div className="skeleton h-5 w-5 rounded-full" />
          <div className="skeleton h-4 w-48" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-6">
              <div className="skeleton h-3.5 w-10" />
              <div className="skeleton h-3.5 w-32" />
              <div className="skeleton h-3.5 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
