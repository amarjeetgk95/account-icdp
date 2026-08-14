import React from 'react';
import { useGTR44Store } from '../store/gtr44Store';
import { GTR44Document } from './GTR44Document';
import { PrintButton } from './PrintButton';
import { Button } from '../../../components/ui/button';
import { Edit, CheckCircle, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

export const GTR44LivePreview: React.FC = () => {
  const { formData, viewPage, setViewPage, zoomLevel, setZoomLevel, setActiveTab } = useGTR44Store();

  return (
    <div className="space-y-4">
      {/* Control Banner (Hidden in Print) */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row justify-between items-center gap-4 print:hidden">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-gray-900">Official GTR-44 4-Page Live Document</h2>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center">
              <CheckCircle className="h-3 w-3 mr-1" /> Live Sync Active
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Pixel-perfect reproduction of Form G.T.R. 44 (Rule 208) matching the authoritative 4-page Gujarat Treasury master.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
          {/* Page Filter Switcher */}
          <div className="bg-gray-100 p-1 rounded-lg flex space-x-1 text-xs font-medium">
            <button
              onClick={() => setViewPage('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewPage === 'all' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Pages (1-4)
            </button>
            <button
              onClick={() => setViewPage('p1')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewPage === 'p1' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Page 1 (EDP &amp; Form)
            </button>
            <button
              onClick={() => setViewPage('p2')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewPage === 'p2' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Page 2 (Sub-Vouchers)
            </button>
            <button
              onClick={() => setViewPage('p3')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewPage === 'p3' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Page 3 (Certifications)
            </button>
            <button
              onClick={() => setViewPage('p4')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                viewPage === 'p4' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Page 4 (Signatures)
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="bg-gray-100 p-1 rounded-lg flex items-center space-x-1 text-xs">
            <button
              onClick={() => setZoomLevel(zoomLevel - 0.1)}
              className="p-1 text-gray-600 hover:text-gray-900 rounded"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="px-1 font-mono text-gray-700 font-bold text-[11px]">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel(zoomLevel + 0.1)}
              className="p-1 text-gray-600 hover:text-gray-900 rounded"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 text-gray-500 hover:text-gray-800 rounded text-[10px]"
              title="Reset Zoom"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setActiveTab('entry')} className="font-semibold text-xs">
            <Edit className="h-3.5 w-3.5 mr-1 text-blue-600" /> Edit Data
          </Button>

          <PrintButton size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs" />
        </div>
      </div>

      {/* A4 Document Viewport */}
      <div className="bg-gray-200/90 p-4 md:p-8 rounded-xl border border-gray-300 overflow-x-auto min-h-[850px] flex justify-center print:bg-white print:p-0 print:border-none">
        <GTR44Document
          data={formData}
          viewPage={viewPage}
          zoomLevel={zoomLevel}
          containerId="gtr44-live-preview-container"
        />
      </div>
    </div>
  );
};
