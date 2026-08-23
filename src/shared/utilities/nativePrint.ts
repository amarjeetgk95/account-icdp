/**
 * Native Print Engine
 * 
 * Provides robust, popup-isolated native printing with:
 * - DOM input & textarea state synchronization
 * - Dynamic iterative CSS custom property scaling (Fit-to-Page algorithm)
 * - Guaranteed visibility overrides to prevent blank pages
 * - Font & stylesheet inheritance with origin base resolution
 * - Multi-container & multi-section aggregation
 */

export interface AutoFitVariableConfig {
  name: string;
  initial: number;
  min: number;
  step: number;
  unit?: string;
}

export const DEFAULT_AUTO_FIT_VARIABLES: AutoFitVariableConfig[] = [
  { name: '--td-pad', initial: 8, min: 1, step: 0.5, unit: 'px' },
  { name: '--text-mb', initial: 12, min: 2, step: 1, unit: 'px' },
  { name: '--table-mb', initial: 16, min: 2, step: 1, unit: 'px' },
  { name: '--stamp-h', initial: 40, min: 15, step: 2, unit: 'px' },
];

export interface NativePrintOptions {
  /** Target element ID containing the printable page containers */
  viewId?: string;
  /** Array of element IDs or HTMLElements to print */
  elements?: (string | HTMLElement)[];
  /** Window document title */
  title?: string;
  /** Language attribute for <html> (default: 'gu') */
  lang?: string;
  /** Page size (default: 'A4') */
  pageSize?: 'A4' | 'Legal' | 'Letter';
  /** Page margin (default: '5mm') */
  pageMargin?: string;
  /** Page orientation (default: 'portrait') */
  orientation?: 'portrait' | 'landscape';
  /** Selector used to identify individual page containers (default: '.page-container, .gtr-page, .gtr30-page, .report-print-area') */
  pageContainerSelector?: string;
  /** Selector for bottom signature/stamp block to verify against page boundary */
  signatureSelector?: string;
  /** CSS variables to adjust dynamically when content overflows */
  autoFitVariables?: AutoFitVariableConfig[];
  /** Additional CSS styles to inject into the print window */
  customStyles?: string;
  /** Whether to strip fixed/important margin and padding styles (default: false to preserve layout) */
  sanitizeStyles?: boolean;
  /** Whether to trigger window.print() automatically (default: true) */
  autoPrint?: boolean;
  /** Whether to close the print window automatically after print (default: true) */
  autoClose?: boolean;
  /** Delay in milliseconds before calling window.print() (default: 350) */
  printDelayMs?: number;
}

/**
 * Strips restrictive inline style overrides if specifically requested
 */
export function cleanStylesForPrint(htmlStr: string): string {
  if (!htmlStr) return '';
  return htmlStr
    .replace(/margin-bottom:\s*[^;"]+!important;?/gi, '')
    .replace(/padding-bottom:\s*[^;"]+!important;?/gi, '')
    .replace(/line-height:\s*[^;"]+;?/gi, '');
}

/**
 * Synchronizes live user input values and states into cloned DOM nodes
 */
export function syncClonedInputStates(source: HTMLElement, clone: HTMLElement): void {
  const originalInputs = source.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');
  const clonedInputs = clone.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select');

  originalInputs.forEach((input, index) => {
    const cloned = clonedInputs[index];
    if (!cloned) return;

    if (input.tagName === 'TEXTAREA') {
      cloned.innerHTML = (input as HTMLTextAreaElement).value;
      (cloned as HTMLTextAreaElement).value = (input as HTMLTextAreaElement).value;
    } else if (input.tagName === 'SELECT') {
      const select = input as HTMLSelectElement;
      const clonedSelect = cloned as HTMLSelectElement;
      clonedSelect.value = select.value;
      Array.from(clonedSelect.options).forEach((opt, optIdx) => {
        opt.selected = select.options[optIdx]?.selected ?? false;
      });
    } else if (input.tagName === 'INPUT') {
      const inp = input as HTMLInputElement;
      const clonedInp = cloned as HTMLInputElement;
      if (inp.type === 'checkbox' || inp.type === 'radio') {
        if (inp.checked) clonedInp.setAttribute('checked', 'checked');
        else clonedInp.removeAttribute('checked');
        clonedInp.checked = inp.checked;
      } else {
        clonedInp.setAttribute('value', inp.value);
        clonedInp.value = inp.value;
      }
    }
  });
}

/**
 * Collects all stylesheet links and style tags from the current document
 */
export function collectDocumentStyles(): string {
  let styles = '';
  if (typeof document === 'undefined') return styles;
  document.querySelectorAll('link[rel="stylesheet"]').forEach((s) => {
    styles += s.outerHTML + '\n';
  });
  document.querySelectorAll('style').forEach((s) => {
    styles += s.outerHTML + '\n';
  });
  return styles;
}

/**
 * Builds the client-side JavaScript that executes inside the print popup
 * to iteratively converge CSS variables until content fits within page boundaries.
 */
export function buildAutoFitScript(options: {
  pageContainerSelector: string;
  signatureSelector: string;
  autoFitVariables: AutoFitVariableConfig[];
}): string {
  const {
    pageContainerSelector,
    signatureSelector,
    autoFitVariables,
  } = options;

  const varsJson = JSON.stringify(autoFitVariables);

  return `
    try {
      var pageSelector = ${JSON.stringify(pageContainerSelector)};
      var sigSelector = ${JSON.stringify(signatureSelector)};
      var varConfigs = ${varsJson};
      var pages = document.querySelectorAll(pageSelector);

      pages.forEach(function(page) {
        var state = {};
        var minLimitReached = false;

        varConfigs.forEach(function(vc) {
          state[vc.name] = vc.initial;
        });

        var setVars = function() {
          varConfigs.forEach(function(vc) {
            var unit = vc.unit || 'px';
            page.style.setProperty(vc.name, state[vc.name] + unit);
          });
        };

        setVars();
        var guard = 0;

        while (!minLimitReached && guard < 60) {
          var sig = sigSelector ? page.querySelector(sigSelector) : null;
          var over = page.scrollHeight > page.clientHeight + 1;
          var sigOver = false;

          if (sig) {
            var mb = parseFloat(window.getComputedStyle(sig).marginBottom) || 0;
            sigOver = (sig.offsetTop + sig.offsetHeight + mb) > (page.clientHeight + 1);
          }

          if (!over && !sigOver) {
            break;
          }

          var changed = false;
          varConfigs.forEach(function(vc) {
            if (state[vc.name] > vc.min) {
              state[vc.name] = Math.max(vc.min, state[vc.name] - vc.step);
              changed = true;
            }
          });

          if (!changed) {
            minLimitReached = true;
            break;
          }

          setVars();
          guard++;
        }
      });
    } catch (err) {
      console.error('Auto-fit scaling error:', err);
    }
  `;
}

/**
 * Opens an isolated print popup window, renders target elements,
 * applies styles, and executes the dynamic auto-fit scaling algorithm.
 */
export function popupNativePrint(options: NativePrintOptions): Window | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null;
  }

  const {
    viewId,
    elements,
    title = 'Print Document',
    lang = 'gu',
    pageSize = 'A4',
    pageMargin = '0mm',
    orientation = 'portrait',
    pageContainerSelector = '.page-container, .gtr-page, .gtr30-page, .report-print-area',
    signatureSelector = '.signature-block, .govt-stamp-row, .govt-footer-signatures',
    autoFitVariables = DEFAULT_AUTO_FIT_VARIABLES,
    customStyles = '',
    sanitizeStyles = false,
    autoPrint = true,
    autoClose = true,
    printDelayMs = 350,
  } = options;

  const targetElements: HTMLElement[] = [];

  if (viewId) {
    const el = document.getElementById(viewId);
    if (el) targetElements.push(el);
  }

  if (elements && elements.length > 0) {
    elements.forEach((item) => {
      const el = typeof item === 'string' ? document.getElementById(item) : item;
      if (el && !targetElements.includes(el)) targetElements.push(el);
    });
  }

  if (targetElements.length === 0) {
    console.warn('NativePrint: No printable elements found matching options', options);
    return null;
  }

  let printContent = '';

  targetElements.forEach((targetEl) => {
    // Check if target element itself is a page container
    const isSelfMatch = typeof targetEl.matches === 'function' && targetEl.matches(pageContainerSelector);
    if (isSelfMatch) {
      const clone = targetEl.cloneNode(true) as HTMLElement;
      syncClonedInputStates(targetEl, clone);
      printContent += clone.outerHTML + '\n';
      return;
    }

    // Look for page container children inside target element
    const containers = targetEl.querySelectorAll<HTMLElement>(pageContainerSelector);
    if (containers.length > 0) {
      containers.forEach((c) => {
        const clone = c.cloneNode(true) as HTMLElement;
        syncClonedInputStates(c, clone);
        printContent += clone.outerHTML + '\n';
      });
    } else {
      // Fallback: clone the target element directly
      const clone = targetEl.cloneNode(true) as HTMLElement;
      syncClonedInputStates(targetEl, clone);
      printContent += clone.outerHTML + '\n';
    }
  });

  if (sanitizeStyles) {
    printContent = cleanStylesForPrint(printContent);
  }

  const existingStyles = collectDocumentStyles();
  const autoFitScriptCode = buildAutoFitScript({
    pageContainerSelector,
    signatureSelector,
    autoFitVariables,
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to print this document.');
    return null;
  }

  const pageDimensionCss =
    orientation === 'landscape'
      ? '@page { size: ' + pageSize + ' landscape; margin: ' + pageMargin + ' !important; }'
      : '@page { size: ' + pageSize + ' portrait; margin: ' + pageMargin + ' !important; }';

  const defaultPrintStyles = `
    ${pageDimensionCss}

    @page landscape-page {
      size: ${pageSize} landscape !important;
      margin: ${pageMargin} !important;
    }

    @page portrait-page {
      size: ${pageSize} portrait !important;
      margin: ${pageMargin} !important;
    }

    .page-landscape, .gtr30-landscape, .gtr-landscape {
      page: landscape-page !important;
    }

    .page-portrait, .gtr30-portrait, .gtr-portrait {
      page: portrait-page !important;
    }

    /* Force all document elements to be 100% visible on print and screen */
    html, body {
      background: #ffffff !important;
      color: #000000 !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: 100% !important;
      visibility: visible !important;
      opacity: 1 !important;
      display: block !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body * {
      visibility: visible !important;
      box-sizing: border-box;
    }

    @media print {
      html, body, body * {
        visibility: visible !important;
      }
      .no-print {
        display: none !important;
      }
    }

    /* Standard container sizing with no page boundary borders */
    .page-container, .gtr-page, .gtr30-page, .report-print-area {
      visibility: visible !important;
      display: block !important;
      position: relative !important;
      border: none !important;
      box-shadow: none !important;
      margin: 0 auto !important;
      page-break-after: always !important;
      break-after: page !important;
      overflow: visible !important;
      box-sizing: border-box !important;
    }

    .layout-table { margin-bottom: var(--table-mb, 12px) !important; }
    .layout-table td, .layout-table th, .service-table td, .service-table th {
      padding: var(--td-pad, 4px) 4px !important;
    }
    .gujarati-text { margin-bottom: var(--text-mb, 8px) !important; }
    .signature-block, .govt-stamp-row { height: auto; }
    .signature-stamp { max-height: var(--stamp-h, 40px); }
    .no-print { display: none !important; }

    ${customStyles}
  `;

  const originUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const htmlDoc = `
    <!DOCTYPE html>
    <html lang="${lang}">
    <head>
      <meta charset="utf-8" />
      <base href="${originUrl}/" />
      <title>${title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+Gujarati:wght@400;600;700&family=Noto+Sans+Gujarati:wght@400;600;700&display=swap" />
      ${existingStyles}
      <style>
        ${defaultPrintStyles}
      </style>
    </head>
    <body>
      ${printContent}
      <script>
        function runPrint() {
          try {
            ${autoFitScriptCode}
          } catch(e) {
            console.error(e);
          }

          var fontsPromise = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
          fontsPromise.then(function() {
            setTimeout(function() {
              ${autoPrint ? `
                window.focus();
                ${autoClose ? 'window.onafterprint = function() { window.close(); };' : ''}
                window.print();
              ` : ''}
            }, ${printDelayMs});
          });
        }

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          setTimeout(runPrint, 50);
        } else {
          window.addEventListener('DOMContentLoaded', runPrint);
          window.addEventListener('load', runPrint);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlDoc);
  printWindow.document.close();

  return printWindow;
}

/**
 * Helper to print a single container element or ID
 */
export function printElement(
  elementOrId: string | HTMLElement,
  options?: Partial<NativePrintOptions>
): Window | null {
  const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!el) return null;
  return popupNativePrint({
    elements: [el],
    ...options,
  });
}

/**
 * Helper to print multiple container elements or IDs in a single print job
 */
export function printMultipleContainers(
  containers: (string | HTMLElement)[],
  options?: Partial<NativePrintOptions>
): Window | null {
  return popupNativePrint({
    elements: containers,
    ...options,
  });
}
