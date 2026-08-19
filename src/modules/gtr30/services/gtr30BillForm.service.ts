import type { GTR30FormData } from '../types';
import {
  sampleGTR30FormData,
  defaultTransitItems,
  DEFAULT_GTR30_SETTINGS,
  DEFAULT_GTR30_EMPLOYEE_TEMPLATE,
  freshDefaultPosts,
} from '../constants';
import { createDefaultEmployee } from '../constants';

interface BuildNewBillInput {
  settings?: Partial<typeof DEFAULT_GTR30_SETTINGS>;
  employeeTemplate?: Partial<typeof DEFAULT_GTR30_EMPLOYEE_TEMPLATE>;
  defaultPosts?: ReturnType<typeof freshDefaultPosts>;
}

class Gtr30BillFormService {
  emptyFormData(): GTR30FormData {
    return JSON.parse(JSON.stringify(sampleGTR30FormData)) as GTR30FormData;
  }

  normalizeFormData(input: GTR30FormData): GTR30FormData {
    return {
      ...input,
      transits: (input.transits ?? []).map((t) => ({ ...t })),
      establishmentPosts: (input.establishmentPosts ?? []).map((p) => ({ ...p })),
      employees: (input.employees ?? []).map((e) => ({ ...e })),
    };
  }

  buildNewBillFormData(input: BuildNewBillInput = {}): GTR30FormData {
    const settings = { ...DEFAULT_GTR30_SETTINGS, ...input.settings };
    const employeeTemplate = {
      ...DEFAULT_GTR30_EMPLOYEE_TEMPLATE,
      ...input.employeeTemplate,
    };
    const posts = input.defaultPosts ?? freshDefaultPosts();

    return {
      ...sampleGTR30FormData,
      ...settings,
      billRegisterNo: '',
      billDate: '',
      monthOf: '',
      monthYearDigits: '',
      employees: [
        {
          ...createDefaultEmployee(1),
          ...employeeTemplate,
          id: crypto.randomUUID(),
          srNo: 1,
          name: '',
        },
      ],
      establishmentPosts: posts,
      transits: defaultTransitItems.map((t) => ({ ...t })),
      headChargeable: settings.headChargeable,
    };
  }
}

export const gtr30BillFormService = new Gtr30BillFormService();
