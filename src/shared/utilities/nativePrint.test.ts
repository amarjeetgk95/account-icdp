import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cleanStylesForPrint,
  syncClonedInputStates,
  buildAutoFitScript,
  popupNativePrint,
  DEFAULT_AUTO_FIT_VARIABLES,
} from './nativePrint';

describe('cleanStylesForPrint', () => {
  it('handles empty or null string gracefully', () => {
    expect(cleanStylesForPrint('')).toBe('');
  });

  it('strips margin-bottom !important and padding-bottom !important', () => {
    const input = '<div style="margin-bottom: 20px !important; padding-bottom: 10px !important; color: red;">Hello</div>';
    const output = cleanStylesForPrint(input);
    expect(output).not.toContain('margin-bottom');
    expect(output).not.toContain('padding-bottom');
    expect(output).toContain('color: red;');
  });

  it('strips line-height', () => {
    const input = '<p style="line-height: 1.5; font-size: 12px;">Test</p>';
    const output = cleanStylesForPrint(input);
    expect(output).not.toContain('line-height');
    expect(output).toContain('font-size: 12px;');
  });
});

describe('syncClonedInputStates', () => {
  it('syncs input values and checkbox states from source to clone', () => {
    const source = document.createElement('div');
    source.innerHTML = `
      <input type="text" id="name" />
      <input type="checkbox" id="chk" />
      <textarea id="notes"></textarea>
      <select id="sel"><option value="1">One</option><option value="2">Two</option></select>
    `;

    const textInput = source.querySelector<HTMLInputElement>('#name')!;
    textInput.value = 'John Doe';

    const chkInput = source.querySelector<HTMLInputElement>('#chk')!;
    chkInput.checked = true;

    const textarea = source.querySelector<HTMLTextAreaElement>('#notes')!;
    textarea.value = 'Special remarks';

    const select = source.querySelector<HTMLSelectElement>('#sel')!;
    select.value = '2';

    const clone = source.cloneNode(true) as HTMLElement;
    syncClonedInputStates(source, clone);

    const clonedText = clone.querySelector<HTMLInputElement>('#name')!;
    expect(clonedText.getAttribute('value')).toBe('John Doe');
    expect(clonedText.value).toBe('John Doe');

    const clonedChk = clone.querySelector<HTMLInputElement>('#chk')!;
    expect(clonedChk.checked).toBe(true);
    expect(clonedChk.hasAttribute('checked')).toBe(true);

    const clonedTextarea = clone.querySelector<HTMLTextAreaElement>('#notes')!;
    expect(clonedTextarea.value).toBe('Special remarks');
    expect(clonedTextarea.innerHTML).toBe('Special remarks');

    const clonedSelect = clone.querySelector<HTMLSelectElement>('#sel')!;
    expect(clonedSelect.value).toBe('2');
  });
});

describe('buildAutoFitScript', () => {
  it('generates an auto-fit scaling script with page selectors and auto-fit variables', () => {
    const script = buildAutoFitScript({
      pageContainerSelector: '.page-container',
      signatureSelector: '.signature-block',
      autoFitVariables: DEFAULT_AUTO_FIT_VARIABLES,
    });

    expect(script).toContain('.page-container');
    expect(script).toContain('.signature-block');
    expect(script).toContain('--td-pad');
  });
});

describe('popupNativePrint and wrappers', () => {
  let mockPrintWindow: {
    document: {
      open: ReturnType<typeof vi.fn>;
      write: ReturnType<typeof vi.fn>;
      close: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    mockPrintWindow = {
      document: {
        open: vi.fn(),
        write: vi.fn(),
        close: vi.fn(),
      },
    };
    vi.spyOn(window, 'open').mockReturnValue(mockPrintWindow as unknown as Window);
  });

  it('prints an element by ID', () => {
    const container = document.createElement('div');
    container.id = 'test-view';
    container.className = 'page-container';
    container.innerHTML = '<p>Govt Pension Form</p>';
    document.body.appendChild(container);

    const win = popupNativePrint({
      viewId: 'test-view',
      title: 'Pension Case Print',
    });

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(mockPrintWindow.document.open).toHaveBeenCalled();
    expect(mockPrintWindow.document.write).toHaveBeenCalled();
    expect(mockPrintWindow.document.close).toHaveBeenCalled();
    expect(win).toBe(mockPrintWindow);

    document.body.removeChild(container);
  });
});

