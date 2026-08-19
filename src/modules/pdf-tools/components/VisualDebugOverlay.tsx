import React, { useState } from 'react';
import type { SpatialCell, SpatialPage, VisualDebugOptions } from '../types';

interface VisualDebugOverlayProps {
  page: SpatialPage;
  options: VisualDebugOptions;
  onSelectCell?: (cell: SpatialCell) => void;
}

export const VisualDebugOverlay: React.FC<VisualDebugOverlayProps> = ({
  page,
  options,
  onSelectCell,
}) => {
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  const canvasWidth = page.width || 1000;
  const canvasHeight = page.height || 1000;

  // Flatten all table cells on this page
  const allCells = page.tables.flatMap((t) => t.rows.flatMap((r) => r.cells));

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      style={{ width: '100%', height: '100%' }}
    >
      <svg
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="w-full h-full absolute inset-0"
        style={{ pointerEvents: 'auto' }}
      >
        {/* 1. Column Guidelines */}
        {options.showColumnLanes &&
          page.tables.flatMap((t) =>
            t.columns.map((col) => (
              <rect
                key={`col-${col.columnIndex}`}
                x={col.x0}
                y={t.bbox[1]}
                width={col.width}
                height={t.bbox[3] - t.bbox[1]}
                fill="rgba(59, 130, 246, 0.05)"
                stroke="rgba(59, 130, 246, 0.4)"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
            ))
          )}

        {/* 2. Row Guidelines */}
        {options.showRowBands &&
          page.tables.flatMap((t) =>
            t.rows.map((row) => (
              <rect
                key={`row-${row.rowIndex}`}
                x={row.bbox[0]}
                y={row.bbox[1]}
                width={row.bbox[2] - row.bbox[0]}
                height={row.height}
                fill={row.isHeader ? 'rgba(30, 58, 138, 0.12)' : row.isTotal ? 'rgba(16, 185, 129, 0.12)' : 'transparent'}
                stroke={row.isHeader ? 'rgba(30, 58, 138, 0.7)' : row.isTotal ? 'rgba(16, 185, 129, 0.7)' : 'rgba(234, 179, 8, 0.4)'}
                strokeWidth={row.isHeader || row.isTotal ? 2 : 1}
              />
            ))
          )}

        {/* 3. Cell Outlines & Grid Mapping */}
        {options.showCellOutlines &&
          allCells.map((cell) => {
            const isHovered = options.hoveredCellId === cell.id;
            const isSelected = options.selectedCellId === cell.id;
            const w = Math.max(1, cell.bbox[2] - cell.bbox[0]);
            const h = Math.max(1, cell.bbox[3] - cell.bbox[1]);

            return (
              <g key={cell.id}>
                <rect
                  x={cell.bbox[0]}
                  y={cell.bbox[1]}
                  width={w}
                  height={h}
                  fill={
                    isSelected
                      ? 'rgba(99, 102, 241, 0.3)'
                      : isHovered
                      ? 'rgba(99, 102, 241, 0.15)'
                      : 'transparent'
                  }
                  stroke={
                    isSelected
                      ? '#4F46E5'
                      : isHovered
                      ? '#6366F1'
                      : 'rgba(168, 85, 247, 0.4)'
                  }
                  strokeWidth={isSelected || isHovered ? 2.5 : 1}
                  className="cursor-pointer transition-all"
                  onClick={() => onSelectCell?.(cell)}
                />
                {(isHovered || isSelected) && (
                  <text
                    x={cell.bbox[0] + 4}
                    y={cell.bbox[1] + 12}
                    fill="#4F46E5"
                    fontSize="10"
                    fontWeight="bold"
                    className="font-mono pointer-events-none"
                  >
                    R{cell.rowIndex + 1}C{cell.columnIndex + 1}
                  </text>
                )}
              </g>
            );
          })}

        {/* 4. Word-Level Extracted Elements & Bounding Boxes */}
        {options.showBoundingBoxes &&
          page.elements.map((el) => {
            const isHovered = hoveredElementId === el.id;
            const strokeColor =
              el.source === 'manual'
                ? '#4F46E5'
                : el.source === 'pdf-text'
                ? 'rgba(16, 185, 129, 0.8)' // Green for Native PDF text
                : el.source === 'paddle-ocr'
                ? 'rgba(239, 68, 68, 0.8)' // Red/Crimson for PaddleOCR
                : 'rgba(245, 158, 11, 0.8)'; // Amber for Local OCR

            return (
              <g
                key={el.id}
                onMouseEnter={() => setHoveredElementId(el.id)}
                onMouseLeave={() => setHoveredElementId(null)}
                className="cursor-pointer"
              >
                <rect
                  x={el.bbox[0]}
                  y={el.bbox[1]}
                  width={el.width}
                  height={el.height}
                  fill={isHovered ? 'rgba(59, 130, 246, 0.25)' : 'transparent'}
                  stroke={isHovered ? '#2563EB' : strokeColor}
                  strokeWidth={isHovered ? 2 : 1}
                />

                {/* Confidence & Source Badge */}
                {options.showConfidenceBadges && (
                  <g transform={`translate(${el.bbox[0]}, ${Math.max(10, el.bbox[1] - 3)})`}>
                    <rect
                      x="0"
                      y="-9"
                      width={el.source === 'manual' ? 30 : el.confidence < 100 ? 32 : 36}
                      height="10"
                      rx="2"
                      fill={el.source === 'manual' ? '#4338CA' : el.source === 'pdf-text' ? '#065F46' : el.confidence >= 90 ? '#1E3A8A' : '#9A3412'}
                    />
                    <text
                      x="2"
                      y="-1"
                      fill="#ffffff"
                      fontSize="7"
                      fontWeight="bold"
                      className="font-mono"
                    >
                      {el.source === 'manual' ? 'MAN' : el.source === 'pdf-text' ? 'VEC' : `${el.confidence}%`}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
      </svg>
    </div>
  );
};
