-- ============================================================================
-- 040_gr_repository.sql
-- Government Resolution (GR) Repository Schema, Permissions, and RLS Policies
-- Complete 4-Tier Master Taxonomy: Department -> Document Type -> Category -> Subcategory
-- ============================================================================

BEGIN;

-- Safe cleanup for re-running migration cleanly
DROP TABLE IF EXISTS public.gr_document_relations CASCADE;
DROP TABLE IF EXISTS public.gr_repository_access CASCADE;
DROP TABLE IF EXISTS public.gr_audit_logs CASCADE;
DROP TABLE IF EXISTS public.gr_repository CASCADE;
DROP TABLE IF EXISTS public.gr_subcategories CASCADE;
DROP TABLE IF EXISTS public.gr_categories CASCADE;
DROP TABLE IF EXISTS public.gr_departments CASCADE;
DROP TABLE IF EXISTS public.document_types CASCADE;

-- 1. Document Types Master Table
CREATE TABLE public.document_types (
  id VARCHAR(20) PRIMARY KEY,
  name_en VARCHAR(100) NOT NULL,
  name_gu VARCHAR(150) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Departments Master Table
CREATE TABLE IF NOT EXISTS public.gr_departments (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Categories Master Table
CREATE TABLE IF NOT EXISTS public.gr_categories (
  id VARCHAR(20) PRIMARY KEY,
  name_en VARCHAR(150) NOT NULL,
  name_gu VARCHAR(200) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Subcategories Master Table
CREATE TABLE IF NOT EXISTS public.gr_subcategories (
  id VARCHAR(20) PRIMARY KEY,
  category_id VARCHAR(20) NOT NULL REFERENCES public.gr_categories(id) ON DELETE CASCADE,
  name_en VARCHAR(150) NOT NULL,
  name_gu VARCHAR(200) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. GR Repository Main Table
CREATE TABLE IF NOT EXISTS public.gr_repository (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gr_number TEXT NOT NULL,
  title TEXT NOT NULL,
  document_type_id VARCHAR(20) REFERENCES public.document_types(id) ON DELETE SET NULL,
  department_id VARCHAR(50) REFERENCES public.gr_departments(id) ON DELETE SET NULL,
  category_id VARCHAR(20) REFERENCES public.gr_categories(id) ON DELETE SET NULL,
  subcategory_id VARCHAR(20) REFERENCES public.gr_subcategories(id) ON DELETE SET NULL,
  department_name TEXT,
  category_name TEXT,
  subcategory_name TEXT,
  issue_date DATE,
  issue_year INT GENERATED ALWAYS AS (EXTRACT(YEAR FROM issue_date)::INT) STORED,
  description TEXT,
  keywords TEXT[],
  file_name TEXT NOT NULL,
  r2_object_key TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT DEFAULT 'application/pdf',
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'internal', 'private', 'restricted')),
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'cancelled', 'archived')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Document Relations Table
CREATE TABLE IF NOT EXISTS public.gr_document_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_document_id UUID NOT NULL REFERENCES public.gr_repository(id) ON DELETE CASCADE,
  target_document_id UUID NOT NULL REFERENCES public.gr_repository(id) ON DELETE CASCADE,
  relation_type VARCHAR(30) NOT NULL CHECK (relation_type IN ('SUPERSEDES', 'AMENDS', 'CLARIFIES', 'REFERENCES')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unq_document_relation UNIQUE (source_document_id, target_document_id, relation_type),
  CONSTRAINT chk_no_self_relation CHECK (source_document_id <> target_document_id)
);

-- 7. Private GR Access Assignments Table
CREATE TABLE IF NOT EXISTS public.gr_repository_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gr_id UUID NOT NULL REFERENCES public.gr_repository(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gr_id, user_id)
);

-- 8. GR Audit Logs Table
CREATE TABLE IF NOT EXISTS public.gr_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  gr_id UUID REFERENCES public.gr_repository(id) ON DELETE SET NULL,
  gr_number TEXT,
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  action TEXT NOT NULL,
  previous_visibility TEXT,
  new_visibility TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_gr_repo_gr_number ON public.gr_repository(gr_number);
CREATE INDEX IF NOT EXISTS idx_gr_repo_doc_type ON public.gr_repository(document_type_id);
CREATE INDEX IF NOT EXISTS idx_gr_repo_issue_date ON public.gr_repository(issue_date);
CREATE INDEX IF NOT EXISTS idx_gr_repo_department ON public.gr_repository(department_id);
CREATE INDEX IF NOT EXISTS idx_gr_repo_category ON public.gr_repository(category_id);
CREATE INDEX IF NOT EXISTS idx_gr_repo_subcategory ON public.gr_repository(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_gr_repo_visibility ON public.gr_repository(visibility);
CREATE INDEX IF NOT EXISTS idx_gr_repo_owner ON public.gr_repository(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_gr_repo_status ON public.gr_repository(status);
CREATE INDEX IF NOT EXISTS idx_gr_repo_created_at ON public.gr_repository(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gr_doc_rel_source ON public.gr_document_relations(source_document_id);
CREATE INDEX IF NOT EXISTS idx_gr_doc_rel_target ON public.gr_document_relations(target_document_id);
CREATE INDEX IF NOT EXISTS idx_gr_access_gr_user ON public.gr_repository_access(gr_id, user_id);
CREATE INDEX IF NOT EXISTS idx_gr_audit_gr_id ON public.gr_audit_logs(gr_id);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_gr_repo_fts ON public.gr_repository USING gin(
  to_tsvector('english', coalesce(gr_number, '') || ' ' || coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(department_name, '') || ' ' || coalesce(category_name, ''))
);

-- 10. Row Level Security (RLS)
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gr_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gr_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gr_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gr_repository ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gr_document_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gr_repository_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gr_audit_logs ENABLE ROW LEVEL SECURITY;

-- 10a. Master Tables: All authenticated office users can read and manage taxonomy
CREATE POLICY "doc_types_select" ON public.document_types FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "doc_types_insert" ON public.document_types FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "doc_types_update" ON public.document_types FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "doc_types_delete" ON public.document_types FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "gr_departments_select" ON public.gr_departments FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "gr_departments_insert" ON public.gr_departments FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "gr_departments_update" ON public.gr_departments FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "gr_departments_delete" ON public.gr_departments FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "gr_categories_select" ON public.gr_categories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "gr_categories_insert" ON public.gr_categories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "gr_categories_update" ON public.gr_categories FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "gr_categories_delete" ON public.gr_categories FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "gr_subcategories_select" ON public.gr_subcategories FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "gr_subcategories_insert" ON public.gr_subcategories FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "gr_subcategories_update" ON public.gr_subcategories FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "gr_subcategories_delete" ON public.gr_subcategories FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "gr_relations_select" ON public.gr_document_relations FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "gr_relations_insert" ON public.gr_document_relations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "gr_relations_delete" ON public.gr_document_relations FOR DELETE USING (auth.uid() IS NOT NULL);

-- 10b. GR Repository Read Policy (Single Office: all authenticated office users)
CREATE POLICY "gr_repository_select" ON public.gr_repository
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 10c. GR Repository Insert Policy
CREATE POLICY "gr_repository_insert" ON public.gr_repository
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 10d. GR Repository Update Policy
CREATE POLICY "gr_repository_update" ON public.gr_repository
  FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 10e. GR Repository Delete Policy
CREATE POLICY "gr_repository_delete" ON public.gr_repository
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- 10f. Access & Audit Policies
CREATE POLICY "gr_access_select" ON public.gr_repository_access
  FOR SELECT USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR gr_id IN (
      SELECT id FROM public.gr_repository WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "gr_access_insert" ON public.gr_repository_access
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR gr_id IN (
      SELECT id FROM public.gr_repository WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "gr_access_delete" ON public.gr_repository_access
  FOR DELETE USING (
    public.is_admin()
    OR gr_id IN (
      SELECT id FROM public.gr_repository WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "gr_audit_select" ON public.gr_audit_logs
  FOR SELECT USING (
    public.is_admin()
    OR user_id = auth.uid()
    OR gr_id IN (
      SELECT id FROM public.gr_repository
      WHERE visibility IN ('public', 'internal')
         OR owner_user_id = auth.uid()
         OR id IN (SELECT gr_id FROM public.gr_repository_access WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "gr_audit_insert" ON public.gr_audit_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- ============================================================================
-- 11. SEED DATA
-- ============================================================================

-- Document Types
INSERT INTO public.document_types (id, name_en, name_gu, display_order) VALUES
('DOC-01', 'GR / Government Resolution', 'સરકારી ઠરાવ', 1),
('DOC-02', 'Circular', 'પરિપત્ર', 2),
('DOC-03', 'Notification', 'જાહેરનામું', 3),
('DOC-04', 'Government Order', 'સરકારી આદેશ', 4),
('DOC-05', 'Office Order', 'કચેરી આદેશ', 5),
('DOC-06', 'Guideline / SOP', 'માર્ગદર્શિકા / એસ.ઓ.પી.', 6),
('DOC-07', 'Instruction / Clarification', 'સૂચના / સ્પષ્ટતા', 7),
('DOC-08', 'Amendment', 'સુધારો / શુદ્ધિપત્રક', 8)
ON CONFLICT (id) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_gu = EXCLUDED.name_gu,
  display_order = EXCLUDED.display_order;

-- Departments
INSERT INTO public.gr_departments (id, name, code, description) VALUES
('dept_ah', 'Agriculture, Farmers Welfare & Co-operation Department (Animal Husbandry)', 'AGRI_AH', 'Pashupalan & Livestock Development Division'),
('dept_gad', 'General Administration Department (GAD)', 'GAD', 'General Administration, Service Rules & Establishment'),
('dept_fd', 'Finance Department (FD)', 'FD', 'Budget, Pay Commission, Allowances & Fiscal Rules'),
('dept_panchayat', 'Panchayats, Rural Housing & Rural Development', 'PRHD', 'District & Taluka Panchayat Administration'),
('dept_health', 'Health & Family Welfare Department', 'HFWD', 'Medical Services & Public Health'),
('dept_tribal', 'Tribal Development Department', 'TDD', 'Tribal Area Sub-Plan (TASP) Schemes')
ON CONFLICT (id) DO NOTHING;

-- 9 Master Categories
INSERT INTO public.gr_categories (id, name_en, name_gu, display_order) VALUES
('CAT-01', 'General Administration & Office Management', 'સામાન્ય વહીવટ અને કચેરી સંચાલન', 1),
('CAT-02', 'Establishment & Service Matters', 'મહેકમ અને સેવા બાબતો', 2),
('CAT-03', 'Pay, Allowances & Employee Benefits', 'પગાર, ભથ્થાં અને કર્મચારી લાભો', 3),
('CAT-04', 'Finance, Accounts & Audit', 'નાણાં, હિસાબ અને ઓડિટ', 4),
('CAT-05', 'Schemes, Subsidies & Beneficiary Programmes', 'યોજનાઓ, સબસિડી અને લાભાર્થી કાર્યક્રમો', 5),
('CAT-06', 'Livestock Breeding, Development & Fodder', 'પશુ સંવર્ધન, પશુધન વિકાસ અને ઘાસચારો', 6),
('CAT-07', 'Veterinary Services, Animal Health & Disease Control', 'વેટરનરી સેવાઓ, પશુ આરોગ્ય અને રોગ નિયંત્રણ', 7),
('CAT-08', 'Procurement, Tenders & Civil Works', 'ખરીદી, ટેન્ડર અને બાંધકામ કામો', 8),
('CAT-09', 'Legal, Regulatory & Statutory Matters', 'કાયદાકીય, નિયમનકારી અને વૈધાનિક બાબતો', 9)
ON CONFLICT (id) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_gu = EXCLUDED.name_gu,
  display_order = EXCLUDED.display_order;

-- 51 Master Subcategories
INSERT INTO public.gr_subcategories (id, category_id, name_en, name_gu, display_order) VALUES
-- CAT-01
('SUB-0101', 'CAT-01', 'Office Procedures & Record Management', 'કચેરી પદ્ધતિ અને રેકર્ડ સંચાલન', 1),
('SUB-0102', 'CAT-01', 'RTI & Public Grievances', 'માહિતી અધિકાર અને જાહેર ફરિયાદ નિવારણ', 2),
('SUB-0103', 'CAT-01', 'Committees, Meetings & Inspections', 'સમિતિઓ, બેઠકો અને તપાસણી', 3),
('SUB-0104', 'CAT-01', 'Vehicles, Fuel & Logistics', 'વાહનો, ઇંધણ અને લોજિસ્ટિક્સ', 4),
('SUB-0105', 'CAT-01', 'Stationery, Printing & Library Management', 'સ્ટેશનરી, મુદ્રણ અને પુસ્તકાલય સંચાલન', 5),
('SUB-0106', 'CAT-01', 'IT, Digital Services & e-Governance', 'આઇ.ટી., ડિજિટલ સેવાઓ અને ઇ-ગવર્નન્સ', 6),

-- CAT-02
('SUB-0201', 'CAT-02', 'Recruitment, Roster & Direct Appointment', 'ભરતી, રોસ્ટર અને સીધી નિમણૂક', 1),
('SUB-0202', 'CAT-02', 'Promotion & Seniority', 'બઢતી અને સિનિયોરિટી (પ્રવરતા)', 2),
('SUB-0203', 'CAT-02', 'Transfer, Posting & Deputation', 'બદલી, પોસ્ટીંગ અને ડેપ્યુટેશન', 3),
('SUB-0204', 'CAT-02', 'Service Rules, Cadre & Recruitment Rules (RR)', 'સેવા નિયમો, સંવર્ગ અને ભરતી નિયમો', 4),
('SUB-0205', 'CAT-02', 'Leave, Training & Departmental Exams', 'રજા, તાલીમ અને ખાતાકીય પરીક્ષાઓ', 5),
('SUB-0206', 'CAT-02', 'Discipline, Departmental Inquiry & Vigilance', 'શિસ્તભંગ, ખાતાકીય તપાસ અને તકેદારી', 6),
('SUB-0207', 'CAT-02', 'Retirement, Resignation & Post-Death Matters', 'નિવૃત્તિ, રાજીનામું અને મરણોત્તર બાબતો', 7),

-- CAT-03
('SUB-0301', 'CAT-03', 'Pay Scale, Pay Fixation & Pay Commission', 'પગાર ધોરણ, પગાર નિર્ધારણ અને પગાર પંચ', 1),
('SUB-0302', 'CAT-03', 'DA, HRA, CLA & Other Allowances', 'મોંઘવારી, ઘરભાડું અને અન્ય ભથ્થાં', 2),
('SUB-0303', 'CAT-03', 'Pension, Gratuity & NPS', 'પેન્શન, ગ્રેચ્યુઇટી અને એન.પી.એસ.', 3),
('SUB-0304', 'CAT-03', 'Medical Reimbursement & Health Benefits', 'તબીબી ખર્ચ રિઈમ્બર્સમેન્ટ અને આરોગ્ય લાભો', 4),
('SUB-0305', 'CAT-03', 'GPF, Insurance, Loans & Advances', 'જી.પી.એફ., જૂથ વીમો, લોન અને પેશગી', 5),

-- CAT-04
('SUB-0401', 'CAT-04', 'Budget Estimates & Revised Estimates', 'અંદાજપત્ર અને સુધારેલા અંદાજો', 1),
('SUB-0402', 'CAT-04', 'Grant Allocation & Reappropriation', 'ગ્રાન્ટ ફાળવણી અને પુનઃવિનિયોગ', 2),
('SUB-0403', 'CAT-04', 'Delegation of Financial Powers', 'નાણાકીય સત્તા સોંપણી', 3),
('SUB-0404', 'CAT-04', 'Audit Objections, PAC & Inspection Reports', 'ઓડિટ વાંધા, પીએસી અને તપાસ અહેવાલો', 4),
('SUB-0405', 'CAT-04', 'Contingency & Office Expenditure', 'આકસ્મિક ખર્ચ અને કચેરી ખર્ચ', 5),
('SUB-0406', 'CAT-04', 'Accounts & Financial Procedures', 'હિસાબી અને નાણાકીય કાર્યપદ્ધતિ', 6),

-- CAT-05
('SUB-0501', 'CAT-05', 'State Schemes & Special Programmes', 'રાજ્ય યોજનાઓ અને વિશેષ કાર્યક્રમો', 1),
('SUB-0502', 'CAT-05', 'Central Schemes / CSS / Central Sector', 'કેન્દ્રીય યોજનાઓ / સીએસએસ / કેન્દ્રીય ક્ષેત્ર', 2),
('SUB-0503', 'CAT-05', 'Individual Beneficiary Assistance & DBT', 'વ્યક્તિગત લાભાર્થી સહાય અને ડી.બી.ટી.', 3),
('SUB-0504', 'CAT-05', 'Subsidies & Input Assistance', 'સબસિડી અને સાધન/ઇનપુટ સહાય', 4),
('SUB-0505', 'CAT-05', 'Livestock Farmer Training, Camps & Extension', 'પશુપાલક તાલીમ, શિબિર અને વિસ્તરણ', 5),
('SUB-0506', 'CAT-05', 'Scheme Guidelines, Implementation & Amendments', 'યોજના માર્ગદર્શિકા, અમલીકરણ અને સુધારા', 6),

-- CAT-06
('SUB-0601', 'CAT-06', 'Cattle & Buffalo Development', 'ગાય અને ભેંસ સંવર્ધન/વિકાસ', 1),
('SUB-0602', 'CAT-06', 'Sheep & Goat Development', 'ઘેટાં અને બકરાં સંવર્ધન/વિકાસ', 2),
('SUB-0603', 'CAT-06', 'Poultry & Other Livestock Development', 'મરઘાં અને અન્ય પશુધન વિકાસ', 3),
('SUB-0604', 'CAT-06', 'Breeding, Artificial Insemination (AI) & Frozen Semen', 'સંવર્ધન, કૃત્રિમ બીજદાન અને હિમીકૃત વીર્ય', 4),
('SUB-0605', 'CAT-06', 'Liquid Nitrogen (LN2) & Breeding Infrastructure', 'પ્રવાહી નાઇટ્રોજન અને સંવર્ધન માળખું', 5),
('SUB-0606', 'CAT-06', 'Fodder Seeds, Minikits & Fodder Development', 'ઘાસચારા બિયારણ, મિનિકીટ અને ઘાસચારો વિકાસ', 6),
('SUB-0607', 'CAT-06', 'Pasture / Gauchar Development', 'ગૌચર અને ઘાસિયા જમીન સુધારણા', 7),
('SUB-0608', 'CAT-06', 'Dairy Development & Milk Recording', 'ડેરી વિકાસ અને દૂધ નોંધણી', 8),

-- CAT-07
('SUB-0701', 'CAT-07', 'Disease Control, Outbreak & Emergency Response', 'રોગ નિયંત્રણ, રોગચાળો અને કટોકટી વ્યવસ્થા', 1),
('SUB-0702', 'CAT-07', 'Vaccination & Immunization', 'રસીકરણ અને રોગપ્રતિકારકતા', 2),
('SUB-0703', 'CAT-07', 'Veterinary Hospitals, Clinics & MVUs', 'પશુ દવાખાના, પોલિક્લિનિક અને એમ.વી.યુ.', 3),
('SUB-0704', 'CAT-07', 'Animal Health Camps & Pashu Melas', 'પશુ આરોગ્ય મેળાઓ અને શિબિરો', 4),
('SUB-0705', 'CAT-07', 'Medicines, Vaccines & Medical Supplies', 'દવાઓ, રસીઓ અને મેડિકલ સપ્લાય', 5),
('SUB-0706', 'CAT-07', 'Disease Surveillance, Sample Testing & Laboratories', 'રોગ સર્વેક્ષણ, નમૂના પરીક્ષણ અને પ્રયોગશાળાઓ', 6),
('SUB-0707', 'CAT-07', 'Animal Welfare, Gaushala & Panjrapole Matters', 'પશુ કલ્યાણ, ગૌશાળા અને પાંજરાપોળ બાબતો', 7),

-- CAT-08
('SUB-0801', 'CAT-08', 'Purchase Procedures & Tender', 'ખરીદી કાર્યપદ્ધતિ અને ટેન્ડર', 1),
('SUB-0802', 'CAT-08', 'Rate Contract & Annual Contract', 'ભાવ કરાર અને વાર્ષિક ઈજારો (કોન્ટ્રાક્ટ)', 2),
('SUB-0803', 'CAT-08', 'Equipment, Machinery & Lab Instruments', 'સાધનસામગ્રી, મશીનરી અને લેબ સાધનો', 3),
('SUB-0804', 'CAT-08', 'Civil Construction & Building Works', 'બાંધકામ અને મકાન કામો', 4),
('SUB-0805', 'CAT-08', 'Repair & Maintenance', 'રિપેરિંગ અને નિભાવણી', 5),
('SUB-0806', 'CAT-08', 'Land Acquisition, Allotment & Property Assets', 'જમીન સંપાદન, ફાળવણી અને મિલકતો', 6),
('SUB-0807', 'CAT-08', 'Condemnation, Auction & Disposal', 'બિનઉપયોગી સાધન નિકાલ, હરાજી અને કન્ડમેશન', 7),

-- CAT-09
('SUB-0901', 'CAT-09', 'Acts, Rules & Regulations', 'અધિનિયમો, કાયદા અને નિયમો', 1),
('SUB-0902', 'CAT-09', 'Notifications & Statutory Orders', 'જાહેરનામા અને વૈધાનિક આદેશો', 2),
('SUB-0903', 'CAT-09', 'Court Cases, Affidavits & Legal Opinions', 'કોર્ટ કેસ, સોગંદનામા અને કાનૂની અભિપ્રાય', 3),
('SUB-0904', 'CAT-09', 'Statutory Authorities, Councils & Registrations', 'વૈધાનિક સત્તામંડળો, કાઉન્સિલ અને નોંધણી', 4),
('SUB-0905', 'CAT-09', 'Livestock Import, Export & Quarantine', 'પશુધન આયાત, નિકાસ અને ક્વોરેન્ટાઇન', 5),
('SUB-0906', 'CAT-09', 'Prevention of Cruelty to Animals & Compliance', 'પશુ ક્રૂરતા નિવારણ અને પાલન', 6)
ON CONFLICT (id) DO UPDATE SET
  name_en = EXCLUDED.name_en,
  name_gu = EXCLUDED.name_gu,
  display_order = EXCLUDED.display_order;

-- 12. Helper Function for Audit Logging
CREATE OR REPLACE FUNCTION public.gr_log_action(
  p_gr_id UUID,
  p_gr_number TEXT,
  p_action TEXT,
  p_prev_visibility TEXT DEFAULT NULL,
  p_new_visibility TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_role TEXT;
  v_email TEXT;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.gr_audit_logs (
    gr_id,
    gr_number,
    user_id,
    user_email,
    user_role,
    action,
    previous_visibility,
    new_visibility,
    details
  ) VALUES (
    p_gr_id,
    p_gr_number,
    auth.uid(),
    v_email,
    coalesce(v_role, 'office'),
    p_action,
    p_prev_visibility,
    p_new_visibility,
    p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMIT;
