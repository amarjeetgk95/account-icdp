import React, { useState, useEffect } from 'react';
import {
  Languages,
  Sliders,
  ChevronDown,
  ChevronUp,
  Cpu,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { ExtractionMode, ExtractionOptions, OcrLanguage } from '../types';
import { paddleOcrEngine } from '../services/ocr/paddleOcr.service';

interface OcrSettingsPanelProps {
  options: ExtractionOptions;
  onChangeOptions: (newOptions: ExtractionOptions) => void;
  disabled?: boolean;
}

export const OcrSettingsPanel: React.FC<OcrSettingsPanelProps> = ({
  options,
  onChangeOptions,
  disabled = false,
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [serverUrl, setServerUrl] = useState(paddleOcrEngine.getServerUrl());
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  const [isServerOnline, setIsServerOnline] = useState<boolean | null>(null);

  useEffect(() => {
    checkServerConnection();
  }, []);

  const checkServerConnection = async () => {
    setIsCheckingServer(true);
    try {
      paddleOcrEngine.setServerUrl(serverUrl);
      const online = await paddleOcrEngine.isAvailable();
      setIsServerOnline(online);
    } catch {
      setIsServerOnline(false);
    } finally {
      setIsCheckingServer(false);
    }
  };

  const handleLanguageChange = (lang: OcrLanguage) => {
    onChangeOptions({ ...options, language: lang });
  };

  const handleModeChange = (mode: ExtractionMode) => {
    onChangeOptions({ ...options, mode });
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
            <Sliders size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Extraction &amp; Spatial OCR Settings
              </h4>
              {isServerOnline ? (
                <span className="inline-flex items-center gap-1 text-[0.65rem] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold">
                  <CheckCircle2 size={10} className="text-emerald-600" />
                  PaddleOCR Local Online
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[0.65rem] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                  <AlertCircle size={10} className="text-amber-600" />
                  Client Engine Active
                </span>
              )}
            </div>
            <p className="text-[0.68rem] text-slate-500">
              Configure recognition engine, language models, and 2D spatial grid sensitivity
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="inline-flex items-center gap-1 text-[0.72rem] font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          {isAdvancedOpen ? 'Simple Settings' : 'Advanced Engine & Filters'}
          {isAdvancedOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Primary Grid: Language & Extraction Mode */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Language Selection */}
        <div className="space-y-1.5">
          <label className="text-[0.72rem] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Languages size={13} className="text-indigo-600" />
            OCR Document Language:
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleLanguageChange('eng')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                options.language === 'eng'
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              English (eng)
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleLanguageChange('guj')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                options.language === 'guj'
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              ગુજરાતી (guj)
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleLanguageChange('eng+guj')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                options.language === 'eng+guj'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Dual (Eng + Guj)
            </button>
          </div>
        </div>

        {/* Engine Extraction Mode */}
        <div className="space-y-1.5">
          <label className="text-[0.72rem] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Cpu size={13} className="text-indigo-600" />
            Extraction Strategy:
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleModeChange('hybrid')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                options.mode === 'hybrid'
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-600 hover:bg-slate-100'
              }`}
              title="Smart auto-detection: uses digital layer if present, falls back to OCR if scanned"
            >
              Smart Hybrid
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleModeChange('ocr_only')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                options.mode === 'ocr_only'
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-600 hover:bg-slate-100'
              }`}
              title="Force OCR on canvas image (best for scanned receipts/bills)"
            >
              Force OCR
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={() => handleModeChange('digital_only')}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                options.mode === 'digital_only'
                  ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 shadow-xs'
                  : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-600 hover:bg-slate-100'
              }`}
              title="Fast digital PDF text parsing (instant, non-scanned)"
            >
              Digital Only
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters & Local PaddleOCR Server Settings */}
      {isAdvancedOpen && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-in fade-in">
          {/* Local PaddleOCR Server Configuration */}
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Server size={14} className="text-indigo-600" />
                Local PaddleOCR (PP-OCRv4) Server Connection
              </span>
              <button
                type="button"
                onClick={checkServerConnection}
                disabled={isCheckingServer}
                className="flex items-center gap-1 text-[0.7rem] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
              >
                <RefreshCw size={12} className={isCheckingServer ? 'animate-spin' : ''} />
                Test Connection
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://localhost:5005"
                className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={() => {
                  paddleOcrEngine.setServerUrl(serverUrl);
                  checkServerConnection();
                }}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
            <p className="text-[0.65rem] text-slate-500">
              Run <code className="font-mono text-indigo-600">python scripts/ocr_server.py</code> on your machine for maximum Gujarati + English accuracy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Contrast Enhancement */}
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={options.contrastEnhancement}
                disabled={disabled}
                onChange={(e) =>
                  onChangeOptions({ ...options, contrastEnhancement: e.target.checked })
                }
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Enhance Contrast</span>
            </label>

            {/* Binarization / Thresholding */}
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={options.binarization}
                disabled={disabled}
                onChange={(e) =>
                  onChangeOptions({ ...options, binarization: e.target.checked })
                }
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Adaptive Sauvola Filter</span>
            </label>

            {/* Scale / DPI */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Scan DPI:</span>
              <select
                value={options.renderScale}
                disabled={disabled}
                onChange={(e) =>
                  onChangeOptions({ ...options, renderScale: parseFloat(e.target.value) })
                }
                className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
              >
                <option value="2.0">150 DPI (Fast)</option>
                <option value="3.125">300 DPI (Recommended)</option>
                <option value="4.16">400 DPI (Ultra Sharp)</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
