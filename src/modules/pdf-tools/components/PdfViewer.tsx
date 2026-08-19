import React, { useState, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { SpatialPage, VisualDebugOptions } from '../types/spatial.types';

interface PdfViewerProps {
  page: SpatialPage;
  currentPageIndex: number;
  totalPages: number;
  onPageChange: (newPageIndex: number) => void;
  debugOptions?: VisualDebugOptions;
  onSelectCell?: (cellId: string) => void;
  selectedCellId?: string | null;
  hoveredCellId?: string | null;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  page,
  currentPageIndex,
  totalPages,
  onPageChange,
  onSelectCell,
  selectedCellId,
}) => {
  const [zoomScale, setZoomScale] = useState(1.0);
  const [showOverlays, setShowOverlays] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render canvas whenever page changes
  useEffect(() => {
    if (!canvasRef.current || !page) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (page.canvasElement) {
      canvas.width = page.canvasElement.width;
      canvas.height = page.canvasElement.height;
      ctx.drawImage(page.canvasElement, 0, 0);
    } else {
      // Fallback white canvas with text rendering
      canvas.width = page.width || 800;
      canvas.height = page.height || 1100;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#1e293b';
      ctx.font = '14px sans-serif';
      let yOffset = 40;
      for (const el of page.elements.slice(0, 100)) {
        ctx.fillText(el.text, el.x || 40, el.y || yOffset);
        yOffset += 18;
      }
    }
  }, [page, currentPageIndex]);

  const handleZoomIn = () => setZoomScale((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomScale(1.0);

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-md">
      {/* Viewer Navigation & Zoom Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700 text-xs text-slate-200 shrink-0">
        {/* Page Switcher */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(0, currentPageIndex - 1))}
            disabled={currentPageIndex <= 0}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Previous page"
          >
            <ChevronLeft size={15} />
          </button>
          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700">
            Page {currentPageIndex + 1} of {Math.max(1, totalPages)}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages - 1, currentPageIndex + 1))}
            disabled={currentPageIndex >= totalPages - 1}
            className="p-1 rounded hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title="Next page"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Zoom & Overlay Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowOverlays(!showOverlays)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
              showOverlays ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title="Toggle OCR coordinate box overlays"
          >
            {showOverlays ? <Eye size={12} /> : <EyeOff size={12} />}
            <span>Boxes</span>
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-slate-700 transition-colors cursor-pointer"
            title="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="font-mono text-[11px] w-10 text-center">
            {Math.round(zoomScale * 100)}%
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-slate-700 transition-colors cursor-pointer"
            title="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1 rounded hover:bg-slate-700 transition-colors cursor-pointer"
            title="Fit to view"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Main Viewport Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-950/80 min-h-[350px]"
      >
        <div
          className="relative transition-transform duration-100 ease-out origin-center"
          style={{ transform: `scale(${zoomScale})` }}
        >
          {/* Direct Canvas */}
          <canvas
            ref={canvasRef}
            className="block rounded shadow-2xl bg-white max-w-none pointer-events-none select-none"
          />

          {/* Coordinate Box Overlays */}
          {showOverlays && page && (
            <div className="absolute inset-0 pointer-events-auto">
              {page.elements.map((el) => {
                const isSelected = selectedCellId === el.id;
                const pageW = page.width || 1000;
                const pageH = page.height || 1000;

                const leftPct = (el.x / pageW) * 100;
                const topPct = (el.y / pageH) * 100;
                const widthPct = (el.width / pageW) * 100;
                const heightPct = (el.height / pageH) * 100;

                return (
                  <div
                    key={el.id}
                    onClick={() => onSelectCell?.(el.id)}
                    title={el.text}
                    className={`absolute cursor-pointer transition-all border ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-500/30 ring-2 ring-indigo-400'
                        : 'border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/30'
                    }`}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      width: `${Math.max(widthPct, 1)}%`,
                      height: `${Math.max(heightPct, 1)}%`,
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
