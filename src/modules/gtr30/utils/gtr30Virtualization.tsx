import React, { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { GTR30Employee } from '../types';

/**
 * Virtualization utilities for GTR-30 module
 * Optimizes rendering of large employee lists using virtual scrolling
 */

export interface VirtualizationOptions {
  estimateSize?: number;
  scrollPadding?: number;
  overscan?: number;
  parentRef?: React.RefObject<HTMLDivElement>;
}

export const DEFAULT_VIRTUALIZATION_OPTIONS: VirtualizationOptions = {
  estimateSize: 60,
  scrollPadding: 0,
  overscan: 5,
};

/**
 * Hook for virtualized employee list
 */
export function useVirtualizedEmployees<T = GTR30Employee>(
  items: T[],
  options: VirtualizationOptions = DEFAULT_VIRTUALIZATION_OPTIONS
) {
  const localParentRef = useRef<HTMLDivElement>(null);
  const parentRef = options.parentRef || localParentRef;
  const itemHeight = options.estimateSize ?? DEFAULT_VIRTUALIZATION_OPTIONS.estimateSize ?? 60;

  const virtualizer = useVirtualizer({
    count: items.length,
    estimateSize: () => itemHeight,
    scrollPaddingStart: options.scrollPadding,
    overscan: options.overscan ?? DEFAULT_VIRTUALIZATION_OPTIONS.overscan,
    getScrollElement: () => parentRef.current,
  });

  return {
    virtualizer,
    parentRef,
    virtualItems: virtualizer.getVirtualItems(),
    totalSize: virtualizer.getTotalSize(),
    scrollToIndex: (index: number) => virtualizer.scrollToIndex(index),
    scrollToOffset: (offset: number) => virtualizer.scrollToOffset(offset),
  };
}

/**
 * Virtualized table row component
 */
export interface VirtualizedTableRowProps {
  employee: GTR30Employee;
  index?: number;
  style?: React.CSSProperties;
}

export function VirtualizedTableRow({
  employee,
  style,
}: VirtualizedTableRowProps) {
  return (
    <div style={style} className="flex items-center px-4 py-2 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <span className="w-10 text-center text-xs text-slate-500">{employee.srNo}</span>
      <span className="flex-1 min-w-0 px-2 text-xs font-medium text-slate-900 dark:text-white truncate">
        {employee.name}
      </span>
      <span className="w-24 text-xs text-slate-500 truncate">{employee.hrpnNo || '-'}</span>
      <span className="w-32 text-xs text-slate-600 dark:text-slate-400 truncate">
        {employee.designation}
      </span>
      <span className="w-24 text-right text-xs num text-slate-700 dark:text-slate-300">
        ₹{employee.payOfEstablishment.toLocaleString('en-IN')}
      </span>
    </div>
  );
}

/**
 * Virtualized table container component
 */
export function VirtualizedTableContainer({
  children,
  height = 400,
  className = '',
}: {
  children: React.ReactNode;
  height?: number;
  className?: string;
}) {
  return (
    <div
      style={{ height }}
      className={`overflow-y-auto ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Virtualized table body wrapper
 */
export function VirtualizedTableBody({
  children,
  totalSize,
  parentRef,
}: {
  children: React.ReactNode;
  totalSize: number;
  parentRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div
      ref={parentRef}
      style={{ height: totalSize }}
      className="relative"
    >
      {children}
    </div>
  );
}

/**
 * Virtualized row wrapper
 */
export function VirtualizedRow({
  children,
  size,
  start,
}: {
  children: React.ReactNode;
  index?: number;
  size: number;
  start: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${size}px`,
        transform: `translateY(${start}px)`,
      }}
      className="flex items-center px-4 py-2 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
    >
      {children}
    </div>
  );
}

/**
 * Optimized large employee list component
 */
export function LargeEmployeeList({
  employees,
  onRowClick,
  className = '',
}: {
  employees: GTR30Employee[];
  onRowClick?: (employee: GTR30Employee) => void;
  className?: string;
}) {
  const { virtualizer, parentRef, virtualItems } = useVirtualizedEmployees(employees);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 flex border-b border-slate-200 dark:border-slate-700">
        <span className="w-10 text-center">#</span>
        <span className="flex-1 min-w-0 px-2">Employee Name</span>
        <span className="w-24">HRPN</span>
        <span className="w-32">Designation</span>
        <span className="w-24 text-right">Basic Pay</span>
      </div>

      <VirtualizedTableContainer height={400} className={className}>
        <div
          ref={parentRef}
          style={{ height: virtualizer.getTotalSize() }}
          className="relative"
        >
          {virtualItems.map((virtualRow) => {
            const employee = employees[virtualRow.index];
            if (!employee) return null;
            return (
              <VirtualizedRow
                key={virtualRow.key}
                index={virtualRow.index}
                size={virtualRow.size}
                start={virtualRow.start}
              >
                <span className="w-10 text-center text-xs text-slate-500">
                  {employee.srNo}
                </span>
                <span
                  className="flex-1 min-w-0 px-2 text-xs font-medium text-slate-900 dark:text-white truncate cursor-pointer hover:text-blue-600"
                  onClick={() => onRowClick?.(employee)}
                >
                  {employee.name}
                </span>
                <span className="w-24 text-xs text-slate-500 truncate">
                  {employee.hrpnNo || '-'}
                </span>
                <span className="w-32 text-xs text-slate-600 dark:text-slate-400 truncate">
                  {employee.designation}
                </span>
                <span className="w-24 text-right text-xs num text-slate-700 dark:text-slate-300">
                  ₹{employee.payOfEstablishment.toLocaleString('en-IN')}
                </span>
              </VirtualizedRow>
            );
          })}
        </div>
      </VirtualizedTableContainer>
    </div>
  );
}

/**
 * Optimized employee card list for mobile
 */
export function LargeEmployeeCardList({
  employees,
  onCardClick,
}: {
  employees: GTR30Employee[];
  onCardClick?: (employee: GTR30Employee) => void;
}) {
  const { virtualizer, parentRef, virtualItems } = useVirtualizedEmployees(employees, {
    estimateSize: 120,
    overscan: 3,
  });

  return (
    <div className="grid grid-cols-1 gap-4">
      <div
        ref={parentRef}
        style={{ height: virtualizer.getTotalSize() }}
        className="relative"
      >
        {virtualItems.map((virtualRow) => {
          const employee = employees[virtualRow.index];
          if (!employee) return null;
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-4 active:scale-[0.98] transition-transform cursor-pointer"
                onClick={() => onCardClick?.(employee)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {employee.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {employee.designation}
                      {employee.cadreClass && <span className="mx-1">•</span>}
                      {employee.cadreClass === '૧' && <span>Class I</span>}
                      {employee.cadreClass === '૨' && <span>Class II</span>}
                      {employee.cadreClass === '૩' && <span>Class III</span>}
                      {employee.cadreClass === '૪' && <span>Class IV</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      ₹{employee.payOfEstablishment.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {employee.hrpnNo || 'No HRPN'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                    <p className="text-slate-500 dark:text-slate-400">DA</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      ₹{employee.da.toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-2">
                    <p className="text-slate-500 dark:text-slate-400">NPS</p>
                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                      ₹{employee.npsPension.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-400">
                    Gross: ₹{(
                      employee.payOfEstablishment +
                      employee.da +
                      employee.hra +
                      employee.transportAllowance +
                      employee.medicalAllowance
                    ).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    Net: ₹{(
                      employee.payOfEstablishment +
                      employee.da +
                      employee.hra +
                      employee.transportAllowance +
                      employee.medicalAllowance -
                      (employee.rentOfBuilding || 0) -
                      (employee.professionalTax || 0) -
                      (employee.npsPension || 0) -
                      (employee.societyDeduction || 0)
                    ).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Debounced scroll handler for virtualized lists
 */
export function createDebouncedScrollHandler(
  callback: (offset: number) => void,
  delay: number = 100
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (offset: number) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(offset), delay);
  };
}

/**
 * Calculate virtualization performance metrics
 */
export interface VirtualizationMetrics {
  visibleCount: number;
  totalVirtualized: number;
  estimatedMemory: number;
  renderTime: number;
}

export function calculateVirtualizationMetrics(
  virtualizer: any,
  employeeCount: number,
  rowHeight: number = 60
): VirtualizationMetrics {
  const virtualItems = virtualizer.getVirtualItems();
  const visibleCount = virtualItems.length;
  const totalVirtualized = employeeCount;
  const estimatedMemory = visibleCount * rowHeight * 4; // Approximate bytes per row

  return {
    visibleCount,
    totalVirtualized,
    estimatedMemory,
    renderTime: 0, // Would be measured in actual implementation
  };
}

/**
 * Optimized pay matrix table
 */
export function PayMatrixTable({
  payEntries,
  onRowClick,
}: {
  payEntries: any[];
  onRowClick?: (entry: any) => void;
}) {
  const { virtualizer, parentRef, virtualItems } = useVirtualizedEmployees(
    payEntries,
    { estimateSize: 45, overscan: 3 }
  );

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <div className="bg-slate-50 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 flex border-b border-slate-200 dark:border-slate-700">
        <span className="w-20">Effective From</span>
        <span className="w-24 text-right">Basic Pay</span>
        <span className="w-20 text-right">DA%</span>
        <span className="flex-1 min-w-0">Notes</span>
      </div>

      <VirtualizedTableContainer height={300}>
        <div
          ref={parentRef}
          style={{ height: virtualizer.getTotalSize() }}
          className="relative"
        >
          {virtualItems.map((virtualRow) => {
            const entry = payEntries[virtualRow.index];
            if (!entry) return null;
            return (
              <div
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="flex items-center px-4 py-2 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                onClick={() => onRowClick?.(entry)}
              >
                <span className="w-20 text-xs text-slate-600 dark:text-slate-400">
                  {entry.effectiveFrom || entry.startDate}
                </span>
                <span className="w-24 text-xs num text-slate-700 dark:text-slate-300 text-right">
                  ₹{Number(entry.basicPay || 0).toLocaleString('en-IN')}
                </span>
                <span className="w-20 text-xs text-slate-600 dark:text-slate-400 text-right">
                  {entry.daPercent || '-'}%
                </span>
                <span className="flex-1 min-w-0 text-xs text-slate-500 truncate">
                  {entry.notes || entry.remark || '-'}
                </span>
              </div>
            );
          })}
        </div>
      </VirtualizedTableContainer>
    </div>
  );
}

/**
 * Hook to detect if virtualization should be enabled based on data size
 */
export function useShouldVirtualize(count: number, threshold: number = 50) {
  return useMemo(() => count > threshold, [count, threshold]);
}
