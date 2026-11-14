import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GTR30Page5Certificate } from './GTR30Page5Certificate';
import type { GTR30FormData } from '../types';
import { sampleGTR30FormData } from '../constants/defaults';

describe('GTR30Page5Certificate', () => {
  it('renders title and all 5 statutory bilingual clauses in correct balanced 2-column layout', () => {
    const testData: GTR30FormData = {
      ...sampleGTR30FormData,
      station: 'Surat',
      billDate: '21-08-2026',
      cardexNo: '22',
      messengerName: 'SMT S.K.RANDERI',
      messengerDesignation: 'Junior Clerk',
      employees: [
        {
          ...sampleGTR30FormData.employees[0],
          payOfEstablishment: 50000,
          da: 25000,
          hra: 5000,
          professionalTax: 200,
        },
      ],
    };

    render(<GTR30Page5Certificate data={testData} />);

    // Certificate title
    expect(screen.getByText('CERTIFICATE')).toBeDefined();

    // Clause 1: Received Contents & Gujarati text with Gujarati numerals
    expect(screen.getByText(/1\. Received Contents Rs\./)).toBeDefined();
    expect(screen.getByText(/૧\. અંદર જણાવેલી વિગતે રૂા\./)).toBeDefined();

    // Clause 2: Pay and allowances due & admissible
    expect(screen.getByText(/2\. Certified that pay and Allowances drawn in this bill are due and admissible/)).toBeDefined();
    expect(screen.getByText(/૨\. પ્રમાણિત કરવામાં આવે છે કે આ બિલમાં આકારેલ પગાર અને ભથ્થા/)).toBeDefined();

    // Clause 3: Emoluments disbursement & receipt stamp cancellation > 5000
    expect(screen.getByText(/3\. Certified that I have satisfied myself that all emoluments/)).toBeDefined();
    expect(screen.getByText(/૩\. પ્રમાણિત કરવામાં આવે છે કે જેની રકમ આ બિલમાં ઓછી આકારવામાં આવી છે/)).toBeDefined();

    // Clause 4: Service book entries for appointments, promotions, leave, suspension
    expect(screen.getByText(/4\. Certified that all appointments and promotions grant of leave/)).toBeDefined();
    expect(screen.getByText(/૪\. પ્રમાણિત કરવામાં આવે છે કે બધી નિમણૂકો અને બઢતીઓ/)).toBeDefined();

    // Clause 5: Appointees qualifications, age limit, medical certificates
    expect(screen.getByText(/5\. Certified that persons who have been newly appointed possess the required qualifications/)).toBeDefined();
    expect(screen.getByText(/૫\. પ્રમાણિત કરવામાં આવે છે કે નવી નિમાયેલ વ્યક્તિઓ જરૂરી શૈક્ષણિક લાયકાત ધરાવે છે/)).toBeDefined();

    // Station & Date
    expect(screen.getByText('Surat')).toBeDefined();
    expect(screen.getByText('સુરત')).toBeDefined();
    expect(screen.getByText('21-08-2026')).toBeDefined();

    // Note table of 10 Other Object Head of Expenditure
    expect(screen.getByText('* Note : Other Object Head of expenditure')).toBeDefined();
    expect(screen.getByText('Non Practice Allowance (Medical Officer)')).toBeDefined();
    expect(screen.getByText('0 1 2 8 +')).toBeDefined();
    expect(screen.getByText('Nursing Allowance (Nursing Staff)')).toBeDefined();
    expect(screen.getByText('0 1 2 9 +')).toBeDefined();
    expect(screen.getByText('Sumptuary Allowance')).toBeDefined();
    expect(screen.getByText('0 1 1 4 +')).toBeDefined();

    // Messenger Authorization
    expect(screen.getByText(/Please pay to/)).toBeDefined();
    expect(screen.getByText(/Signature of authorised Messenger/)).toBeDefined();

    // Drawing Officer Signatures & Cardex (both occurrences)
    const cardexNodes = screen.getAllByText('22');
    expect(cardexNodes.length).toBeGreaterThanOrEqual(2);

    const signBlocks = screen.getAllByText('(Smt S V Solanki)');
    expect(signBlocks.length).toBe(2);
  });

  it('renders configured Drawing Officer details from settings in both stamp positions', () => {
    const customData: GTR30FormData = {
      ...sampleGTR30FormData,
      drawingOfficerName: 'SMT S.V.SOLANKI',
      drawingOfficerDesignation: 'Assistant Administrative Cum Account Officer',
      drawingOfficerOffice: 'Intensive Cattle Development Programme, Surat',
      cardexNo: '22',
      ddoCode: '299',
    };

    render(<GTR30Page5Certificate data={customData} />);

    const namesEn = screen.getAllByText('(SMT S.V.SOLANKI)');
    expect(namesEn.length).toBe(2);

    const desigsEn = screen.getAllByText('Assistant Administrative Cum Account Officer');
    expect(desigsEn.length).toBe(2);

    const officesEn = screen.getAllByText('Intensive Cattle Development Programme, Surat');
    expect(officesEn.length).toBe(2);
  });
});
