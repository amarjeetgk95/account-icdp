import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { GRFilterState, GRDepartment, GRDocumentType, GRCategory, GRSubcategory } from '../types';

interface GRFiltersProps {
  filters: GRFilterState;
  onFilterChange: <K extends keyof GRFilterState>(field: K, value: GRFilterState[K]) => void;
  onCategoryChange: (categoryId: string) => void;
  onReset: () => void;
  departments: GRDepartment[];
  documentTypes: GRDocumentType[];
  categories: GRCategory[];
  subcategories: GRSubcategory[];
  years: number[];
  actions?: React.ReactNode;
}

const SELECT_CLASS =
  'w-full h-8 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50';

const DATE_INPUT_CLASS =
  'w-full h-8 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500';

const LABEL_CLASS =
  'text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1';

export function GRFilters({
  filters,
  onFilterChange,
  onCategoryChange,
  onReset,
  departments,
  documentTypes,
  categories,
  subcategories,
  years,
  actions,
}: GRFiltersProps) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
        <h1 className="text-sm font-bold font-heading text-slate-900 dark:text-white tracking-tight shrink-0 pr-1">
          GR Repository
        </h1>
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <Input
            value={filters.searchQuery}
            onChange={(e) => onFilterChange('searchQuery', e.target.value)}
            placeholder="Search by Document Number, Subject, Category or Keywords..."
            className="pl-10 pr-14 h-9 text-xs sm:text-xs bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 rounded-xl focus-visible:ring-indigo-500"
            aria-label="Search GR repository"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onFilterChange('searchQuery', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
            >
              Clear
            </button>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2.5 pt-1">
        <div>
          <label className={LABEL_CLASS}>Doc Type</label>
          <select
            value={filters.documentTypeId}
            onChange={(e) => onFilterChange('documentTypeId', e.target.value)}
            className={SELECT_CLASS}
            aria-label="Filter by document type"
          >
            <option value="all">All Doc Types</option>
            {documentTypes.map((dt) => (
              <option key={dt.id} value={dt.id}>
                {dt.name_en}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL_CLASS}>Department</label>
          <select
            value={filters.departmentId}
            onChange={(e) => onFilterChange('departmentId', e.target.value)}
            className={SELECT_CLASS}
            aria-label="Filter by department"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL_CLASS}>Category</label>
          <select
            value={filters.categoryId}
            onChange={(e) => onCategoryChange(e.target.value)}
            className={SELECT_CLASS}
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_en}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL_CLASS}>Subcategory</label>
          <select
            value={filters.subcategoryId}
            onChange={(e) => onFilterChange('subcategoryId', e.target.value)}
            disabled={subcategories.length === 0}
            className={SELECT_CLASS}
            aria-label="Filter by subcategory"
          >
            <option value="all">All Subcategories</option>
            {subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name_en}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL_CLASS}>From Date</label>
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange('dateFrom', e.target.value)}
            className={DATE_INPUT_CLASS}
            aria-label="Filter by issue date from"
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>To Date</label>
          <Input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange('dateTo', e.target.value)}
            className={DATE_INPUT_CLASS}
            aria-label="Filter by issue date to"
          />
        </div>

        <div>
          <label className={LABEL_CLASS}>Year</label>
          <select
            value={filters.year}
            onChange={(e) => onFilterChange('year', e.target.value)}
            className={SELECT_CLASS}
            aria-label="Filter by year"
          >
            <option value="all">All Years</option>
            {years.map((y) => (
              <option key={y} value={y.toString()}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={LABEL_CLASS}>Status</label>
          <select
            value={filters.status}
            onChange={(e) =>
              onFilterChange('status', e.target.value as GRFilterState['status'])
            }
            className={SELECT_CLASS}
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            className="w-full h-8 text-xs font-semibold text-slate-600 dark:text-slate-300"
          >
            <RotateCcw size={12} className="mr-1.5" /> Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
