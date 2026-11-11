import type { GRDepartment, GRDocumentType, GRCategory, GRSubcategory, GRFilterState } from '../types';

export const MAX_PDF_SIZE_MB = 50;
export const MAX_PDF_SIZE_BYTES = MAX_PDF_SIZE_MB * 1024 * 1024;
export const ALLOWED_EXTENSIONS = ['.pdf'];
export const ALLOWED_MIME_TYPES = ['application/pdf', 'application/x-pdf'];
export const PDF_SIGNATURE = '%PDF-';

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export const DEFAULT_DEPARTMENTS: GRDepartment[] = [
  {
    id: 'dept_ah',
    name: 'Agriculture, Farmers Welfare & Co-operation Department (Animal Husbandry)',
    code: 'AGRI_AH',
    description: 'Pashupalan & Livestock Development Division',
  },
  {
    id: 'dept_gad',
    name: 'General Administration Department (GAD)',
    code: 'GAD',
    description: 'General Administration, Service Rules & Establishment',
  },
  {
    id: 'dept_fd',
    name: 'Finance Department (FD)',
    code: 'FD',
    description: 'Budget, Pay Commission, Allowances & Fiscal Rules',
  },
  {
    id: 'dept_panchayat',
    name: 'Panchayats, Rural Housing & Rural Development',
    code: 'PRHD',
    description: 'District & Taluka Panchayat Administration',
  },
  {
    id: 'dept_health',
    name: 'Health & Family Welfare Department',
    code: 'HFWD',
    description: 'Medical Services & Public Health',
  },
  {
    id: 'dept_tribal',
    name: 'Tribal Development Department',
    code: 'TDD',
    description: 'Tribal Area Sub-Plan (TASP) Schemes',
  },
];

export const DEFAULT_DOCUMENT_TYPES: GRDocumentType[] = [
  { id: 'DOC-01', name_en: 'GR / Government Resolution', name_gu: 'સરકારી ઠરાવ', display_order: 1 },
  { id: 'DOC-02', name_en: 'Circular', name_gu: 'પરિપત્ર', display_order: 2 },
  { id: 'DOC-03', name_en: 'Notification', name_gu: 'જાહેરનામું', display_order: 3 },
  { id: 'DOC-04', name_en: 'Government Order', name_gu: 'સરકારી આદેશ', display_order: 4 },
  { id: 'DOC-05', name_en: 'Office Order', name_gu: 'કચેરી આદેશ', display_order: 5 },
  { id: 'DOC-06', name_en: 'Guideline / SOP', name_gu: 'માર્ગદર્શિકા / એસ.ઓ.પી.', display_order: 6 },
  { id: 'DOC-07', name_en: 'Instruction / Clarification', name_gu: 'સૂચના / સ્પષ્ટતા', display_order: 7 },
  { id: 'DOC-08', name_en: 'Amendment', name_gu: 'સુધારો / શુદ્ધિપત્રક', display_order: 8 },
];

export const DEFAULT_CATEGORIES: GRCategory[] = [
  {
    id: 'CAT-01',
    name_en: 'General Administration & Office Management',
    name_gu: 'સામાન્ય વહીવટ અને કચેરી સંચાલન',
    display_order: 1,
  },
  {
    id: 'CAT-02',
    name_en: 'Establishment & Service Matters',
    name_gu: 'મહેકમ અને સેવા બાબતો',
    display_order: 2,
  },
  {
    id: 'CAT-03',
    name_en: 'Pay, Allowances & Employee Benefits',
    name_gu: 'પગાર, ભથ્થાં અને કર્મચારી લાભો',
    display_order: 3,
  },
  {
    id: 'CAT-04',
    name_en: 'Finance, Accounts & Audit',
    name_gu: 'નાણાં, હિસાબ અને ઓડિટ',
    display_order: 4,
  },
  {
    id: 'CAT-05',
    name_en: 'Schemes, Subsidies & Beneficiary Programmes',
    name_gu: 'યોજનાઓ, સબસિડી અને લાભાર્થી કાર્યક્રમો',
    display_order: 5,
  },
  {
    id: 'CAT-06',
    name_en: 'Livestock Breeding, Development & Fodder',
    name_gu: 'પશુ સંવર્ધન, પશુધન વિકાસ અને ઘાસચારો',
    display_order: 6,
  },
  {
    id: 'CAT-07',
    name_en: 'Veterinary Services, Animal Health & Disease Control',
    name_gu: 'વેટરનરી સેવાઓ, પશુ આરોગ્ય અને રોગ નિયંત્રણ',
    display_order: 7,
  },
  {
    id: 'CAT-08',
    name_en: 'Procurement, Tenders & Civil Works',
    name_gu: 'ખરીદી, ટેન્ડર અને બાંધકામ કામો',
    display_order: 8,
  },
  {
    id: 'CAT-09',
    name_en: 'Legal, Regulatory & Statutory Matters',
    name_gu: 'કાયદાકીય, નિયમનકારી અને વૈધાનિક બાબતો',
    display_order: 9,
  },
];

export const DEFAULT_SUBCATEGORIES: GRSubcategory[] = [
  // CAT-01: General Administration & Office Management
  { id: 'SUB-0101', category_id: 'CAT-01', name_en: 'Office Procedures & Record Management', name_gu: 'કચેરી પદ્ધતિ અને રેકર્ડ સંચાલન', display_order: 1 },
  { id: 'SUB-0102', category_id: 'CAT-01', name_en: 'RTI & Public Grievances', name_gu: 'માહિતી અધિકાર અને જાહેર ફરિયાદ નિવારણ', display_order: 2 },
  { id: 'SUB-0103', category_id: 'CAT-01', name_en: 'Committees, Meetings & Inspections', name_gu: 'સમિતિઓ, બેઠકો અને તપાસણી', display_order: 3 },
  { id: 'SUB-0104', category_id: 'CAT-01', name_en: 'Vehicles, Fuel & Logistics', name_gu: 'વાહનો, ઇંધણ અને લોજિસ્ટિક્સ', display_order: 4 },
  { id: 'SUB-0105', category_id: 'CAT-01', name_en: 'Stationery, Printing & Library Management', name_gu: 'સ્ટેશનરી, મુદ્રણ અને પુસ્તકાલય સંચાલન', display_order: 5 },
  { id: 'SUB-0106', category_id: 'CAT-01', name_en: 'IT, Digital Services & e-Governance', name_gu: 'આઇ.ટી., ડિજિટલ સેવાઓ અને ઇ-ગવર્નન્સ', display_order: 6 },

  // CAT-02: Establishment & Service Matters
  { id: 'SUB-0201', category_id: 'CAT-02', name_en: 'Recruitment, Roster & Direct Appointment', name_gu: 'ભરતી, રોસ્ટર અને સીધી નિમણૂક', display_order: 1 },
  { id: 'SUB-0202', category_id: 'CAT-02', name_en: 'Promotion & Seniority', name_gu: 'બઢતી અને સિનિયોરિટી (પ્રવરતા)', display_order: 2 },
  { id: 'SUB-0203', category_id: 'CAT-02', name_en: 'Transfer, Posting & Deputation', name_gu: 'બદલી, પોસ્ટીંગ અને ડેપ્યુટેશન', display_order: 3 },
  { id: 'SUB-0204', category_id: 'CAT-02', name_en: 'Service Rules, Cadre & Recruitment Rules (RR)', name_gu: 'સેવા નિયમો, સંવર્ગ અને ભરતી નિયમો', display_order: 4 },
  { id: 'SUB-0205', category_id: 'CAT-02', name_en: 'Leave, Training & Departmental Exams', name_gu: 'રજા, તાલીમ અને ખાતાકીય પરીક્ષાઓ', display_order: 5 },
  { id: 'SUB-0206', category_id: 'CAT-02', name_en: 'Discipline, Departmental Inquiry & Vigilance', name_gu: 'શિસ્તભંગ, ખાતાકીય તપાસ અને તકેદારી', display_order: 6 },
  { id: 'SUB-0207', category_id: 'CAT-02', name_en: 'Retirement, Resignation & Post-Death Matters', name_gu: 'નિવૃત્તિ, રાજીનામું અને મરણોત્તર બાબતો', display_order: 7 },

  // CAT-03: Pay, Allowances & Employee Benefits
  { id: 'SUB-0301', category_id: 'CAT-03', name_en: 'Pay Scale, Pay Fixation & Pay Commission', name_gu: 'પગાર ધોરણ, પગાર નિર્ધારણ અને પગાર પંચ', display_order: 1 },
  { id: 'SUB-0302', category_id: 'CAT-03', name_en: 'DA, HRA, CLA & Other Allowances', name_gu: 'મોંઘવારી, ઘરભાડું અને અન્ય ભથ્થાં', display_order: 2 },
  { id: 'SUB-0303', category_id: 'CAT-03', name_en: 'Pension, Gratuity & NPS', name_gu: 'પેન્શન, ગ્રેચ્યુઇટી અને એન.પી.એસ.', display_order: 3 },
  { id: 'SUB-0304', category_id: 'CAT-03', name_en: 'Medical Reimbursement & Health Benefits', name_gu: 'તબીબી ખર્ચ રિઈમ્બર્સમેન્ટ અને આરોગ્ય લાભો', display_order: 4 },
  { id: 'SUB-0305', category_id: 'CAT-03', name_en: 'GPF, Insurance, Loans & Advances', name_gu: 'જી.પી.એફ., જૂથ વીમો, લોન અને પેશગી', display_order: 5 },

  // CAT-04: Finance, Accounts & Audit
  { id: 'SUB-0401', category_id: 'CAT-04', name_en: 'Budget Estimates & Revised Estimates', name_gu: 'અંદાજપત્ર અને સુધારેલા અંદાજો', display_order: 1 },
  { id: 'SUB-0402', category_id: 'CAT-04', name_en: 'Grant Allocation & Reappropriation', name_gu: 'ગ્રાન્ટ ફાળવણી અને પુનઃવિનિયોગ', display_order: 2 },
  { id: 'SUB-0403', category_id: 'CAT-04', name_en: 'Delegation of Financial Powers', name_gu: 'નાણાકીય સત્તા સોંપણી', display_order: 3 },
  { id: 'SUB-0404', category_id: 'CAT-04', name_en: 'Audit Objections, PAC & Inspection Reports', name_gu: 'ઓડિટ વાંધા, પીએસી અને તપાસ અહેવાલો', display_order: 4 },
  { id: 'SUB-0405', category_id: 'CAT-04', name_en: 'Contingency & Office Expenditure', name_gu: 'આકસ્મિક ખર્ચ અને કચેરી ખર્ચ', display_order: 5 },
  { id: 'SUB-0406', category_id: 'CAT-04', name_en: 'Accounts & Financial Procedures', name_gu: 'હિસાબી અને નાણાકીય કાર્યપદ્ધતિ', display_order: 6 },

  // CAT-05: Schemes, Subsidies & Beneficiary Programmes
  { id: 'SUB-0501', category_id: 'CAT-05', name_en: 'State Schemes & Special Programmes', name_gu: 'રાજ્ય યોજનાઓ અને વિશેષ કાર્યક્રમો', display_order: 1 },
  { id: 'SUB-0502', category_id: 'CAT-05', name_en: 'Central Schemes / CSS / Central Sector', name_gu: 'કેન્દ્રીય યોજનાઓ / સીએસએસ / કેન્દ્રીય ક્ષેત્ર', display_order: 2 },
  { id: 'SUB-0503', category_id: 'CAT-05', name_en: 'Individual Beneficiary Assistance & DBT', name_gu: 'વ્યક્તિગત લાભાર્થી સહાય અને ડી.બી.ટી.', display_order: 3 },
  { id: 'SUB-0504', category_id: 'CAT-05', name_en: 'Subsidies & Input Assistance', name_gu: 'સબસિડી અને સાધન/ઇનપુટ સહાય', display_order: 4 },
  { id: 'SUB-0505', category_id: 'CAT-05', name_en: 'Livestock Farmer Training, Camps & Extension', name_gu: 'પશુપાલક તાલીમ, શિબિર અને વિસ્તરણ', display_order: 5 },
  { id: 'SUB-0506', category_id: 'CAT-05', name_en: 'Scheme Guidelines, Implementation & Amendments', name_gu: 'યોજના માર્ગદર્શિકા, અમલીકરણ અને સુધારા', display_order: 6 },

  // CAT-06: Livestock Breeding, Development & Fodder
  { id: 'SUB-0601', category_id: 'CAT-06', name_en: 'Cattle & Buffalo Development', name_gu: 'ગાય અને ભેંસ સંવર્ધન/વિકાસ', display_order: 1 },
  { id: 'SUB-0602', category_id: 'CAT-06', name_en: 'Sheep & Goat Development', name_gu: 'ઘેટાં અને બકરાં સંવર્ધન/વિકાસ', display_order: 2 },
  { id: 'SUB-0603', category_id: 'CAT-06', name_en: 'Poultry & Other Livestock Development', name_gu: 'મરઘાં અને અન્ય પશુધન વિકાસ', display_order: 3 },
  { id: 'SUB-0604', category_id: 'CAT-06', name_en: 'Breeding, Artificial Insemination (AI) & Frozen Semen', name_gu: 'સંવર્ધન, કૃત્રિમ બીજદાન અને હિમીકૃત વીર્ય', display_order: 4 },
  { id: 'SUB-0605', category_id: 'CAT-06', name_en: 'Liquid Nitrogen (LN2) & Breeding Infrastructure', name_gu: 'પ્રવાહી નાઇટ્રોજન અને સંવર્ધન માળખું', display_order: 5 },
  { id: 'SUB-0606', category_id: 'CAT-06', name_en: 'Fodder Seeds, Minikits & Fodder Development', name_gu: 'ઘાસચારા બિયારણ, મિનિકીટ અને ઘાસચારો વિકાસ', display_order: 6 },
  { id: 'SUB-0607', category_id: 'CAT-06', name_en: 'Pasture / Gauchar Development', name_gu: 'ગૌચર અને ઘાસિયા જમીન સુધારણા', display_order: 7 },
  { id: 'SUB-0608', category_id: 'CAT-06', name_en: 'Dairy Development & Milk Recording', name_gu: 'ડેરી વિકાસ અને દૂધ નોંધણી', display_order: 8 },

  // CAT-07: Veterinary Services, Animal Health & Disease Control
  { id: 'SUB-0701', category_id: 'CAT-07', name_en: 'Disease Control, Outbreak & Emergency Response', name_gu: 'રોગ નિયંત્રણ, રોગચાળો અને કટોકટી વ્યવસ્થા', display_order: 1 },
  { id: 'SUB-0702', category_id: 'CAT-07', name_en: 'Vaccination & Immunization', name_gu: 'રસીકરણ અને રોગપ્રતિકારકતા', display_order: 2 },
  { id: 'SUB-0703', category_id: 'CAT-07', name_en: 'Veterinary Hospitals, Clinics & MVUs', name_gu: 'પશુ દવાખાના, પોલિક્લિનિક અને એમ.વી.યુ.', display_order: 3 },
  { id: 'SUB-0704', category_id: 'CAT-07', name_en: 'Animal Health Camps & Pashu Melas', name_gu: 'પશુ આરોગ્ય મેળાઓ અને શિબિરો', display_order: 4 },
  { id: 'SUB-0705', category_id: 'CAT-07', name_en: 'Medicines, Vaccines & Medical Supplies', name_gu: 'દવાઓ, રસીઓ અને મેડિકલ સપ્લાય', display_order: 5 },
  { id: 'SUB-0706', category_id: 'CAT-07', name_en: 'Disease Surveillance, Sample Testing & Laboratories', name_gu: 'રોગ સર્વેક્ષણ, નમૂના પરીક્ષણ અને પ્રયોગશાળાઓ', display_order: 6 },
  { id: 'SUB-0707', category_id: 'CAT-07', name_en: 'Animal Welfare, Gaushala & Panjrapole Matters', name_gu: 'પશુ કલ્યાણ, ગૌશાળા અને પાંજરાપોળ બાબતો', display_order: 7 },

  // CAT-08: Procurement, Tenders & Civil Works
  { id: 'SUB-0801', category_id: 'CAT-08', name_en: 'Purchase Procedures & Tender', name_gu: 'ખરીદી કાર્યપદ્ધતિ અને ટેન્ડર', display_order: 1 },
  { id: 'SUB-0802', category_id: 'CAT-08', name_en: 'Rate Contract & Annual Contract', name_gu: 'ભાવ કરાર અને વાર્ષિક ઈજારો (કોન્ટ્રાક્ટ)', display_order: 2 },
  { id: 'SUB-0803', category_id: 'CAT-08', name_en: 'Equipment, Machinery & Lab Instruments', name_gu: 'સાધનસામગ્રી, મશીનરી અને લેબ સાધનો', display_order: 3 },
  { id: 'SUB-0804', category_id: 'CAT-08', name_en: 'Civil Construction & Building Works', name_gu: 'બાંધકામ અને મકાન કામો', display_order: 4 },
  { id: 'SUB-0805', category_id: 'CAT-08', name_en: 'Repair & Maintenance', name_gu: 'રિપેરિંગ અને નિભાવણી', display_order: 5 },
  { id: 'SUB-0806', category_id: 'CAT-08', name_en: 'Land Acquisition, Allotment & Property Assets', name_gu: 'જમીન સંપાદન, ફાળવણી અને મિલકતો', display_order: 6 },
  { id: 'SUB-0807', category_id: 'CAT-08', name_en: 'Condemnation, Auction & Disposal', name_gu: 'બિનઉપયોગી સાધન નિકાલ, હરાજી અને કન્ડમેશન', display_order: 7 },

  // CAT-09: Legal, Regulatory & Statutory Matters
  { id: 'SUB-0901', category_id: 'CAT-09', name_en: 'Acts, Rules & Regulations', name_gu: 'અધિનિયમો, કાયદા અને નિયમો', display_order: 1 },
  { id: 'SUB-0902', category_id: 'CAT-09', name_en: 'Notifications & Statutory Orders', name_gu: 'જાહેરનામા અને વૈધાનિક આદેશો', display_order: 2 },
  { id: 'SUB-0903', category_id: 'CAT-09', name_en: 'Court Cases, Affidavits & Legal Opinions', name_gu: 'કોર્ટ કેસ, સોગંદનામા અને કાનૂની અભિપ્રાય', display_order: 3 },
  { id: 'SUB-0904', category_id: 'CAT-09', name_en: 'Statutory Authorities, Councils & Registrations', name_gu: 'વૈધાનિક સત્તામંડળો, કાઉન્સિલ અને નોંધણી', display_order: 4 },
  { id: 'SUB-0905', category_id: 'CAT-09', name_en: 'Livestock Import, Export & Quarantine', name_gu: 'પશુધન આયાત, નિકાસ અને ક્વોરેન્ટાઇન', display_order: 5 },
  { id: 'SUB-0906', category_id: 'CAT-09', name_en: 'Prevention of Cruelty to Animals & Compliance', name_gu: 'પશુ ક્રૂરતા નિવારણ અને પાલન', display_order: 6 },
];

export const DEFAULT_FILTER_STATE: GRFilterState = {
  searchQuery: '',
  departmentId: 'all',
  documentTypeId: 'all',
  categoryId: 'all',
  subcategoryId: 'all',
  dateFrom: '',
  dateTo: '',
  year: 'all',
  visibility: 'all',
  status: 'all',
};
