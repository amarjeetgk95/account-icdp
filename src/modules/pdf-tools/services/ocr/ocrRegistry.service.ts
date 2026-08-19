import type { OcrEngine } from '../../types/spatial.types';
import { paddleOcrEngine } from './paddleOcr.service';
import { localOcrFallbackEngine } from './localOcrFallback.service';

export interface EngineStatus {
  id: string;
  name: string;
  available: boolean;
  isPrimary: boolean;
  serverUrl?: string;
}

export class OcrRegistryService {
  private engines: Map<string, OcrEngine> = new Map();
  private preferredEngineId: string | null = null;

  constructor() {
    this.registerEngine(paddleOcrEngine);
    this.registerEngine(localOcrFallbackEngine);
  }

  registerEngine(engine: OcrEngine): void {
    this.engines.set(engine.id, engine);
  }

  getEngine(id: string): OcrEngine | undefined {
    return this.engines.get(id);
  }

  setPreferredEngine(id: string): void {
    if (this.engines.has(id)) {
      this.preferredEngineId = id;
      if (typeof window !== 'undefined') {
        localStorage.setItem('icdp_preferred_ocr_engine', id);
      }
    }
  }

  /**
   * Returns the best active OCR engine.
   * Prefers local PaddleOCR if running; falls back to client-side local engine.
   */
  async getActiveEngine(): Promise<OcrEngine> {
    const saved = this.preferredEngineId || (typeof window !== 'undefined' ? localStorage.getItem('icdp_preferred_ocr_engine') : null);
    if (saved && this.engines.has(saved)) {
      const preferred = this.engines.get(saved)!;
      if (await preferred.isAvailable()) {
        return preferred;
      }
    }

    // Check PaddleOCR first
    if (await paddleOcrEngine.isAvailable()) {
      return paddleOcrEngine;
    }

    // Default fallback
    return localOcrFallbackEngine;
  }

  /**
   * Diagnostic status of all registered OCR engines
   */
  async checkEngineStatuses(): Promise<EngineStatus[]> {
    const active = await this.getActiveEngine();
    const statuses: EngineStatus[] = [];

    for (const [id, engine] of this.engines.entries()) {
      const available = await engine.isAvailable();
      statuses.push({
        id,
        name: engine.name,
        available,
        isPrimary: active.id === id,
        serverUrl: id === 'paddle-ocr' ? paddleOcrEngine.getServerUrl() : undefined,
      });
    }

    return statuses;
  }
}

export const ocrRegistryService = new OcrRegistryService();
