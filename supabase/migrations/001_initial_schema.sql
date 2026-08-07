-- ICDP Tax System - Initial Schema Migration
-- Created: 2026-08-07

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'office' CHECK (role IN ('admin', 'office')),
  office_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offices table
CREATE TABLE IF NOT EXISTS public.offices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  district TEXT,
  current_fy INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW()),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Office details table
CREATE TABLE IF NOT EXISTS public.office_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  office_name TEXT,
  subtitle TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  gst TEXT,
  tan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(office_id)
);

-- Employees table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  pan TEXT NOT NULL,
  join_date DATE,
  transfer_date DATE,
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee salaries table
CREATE TABLE IF NOT EXISTS public.employee_salaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  financial_year INTEGER NOT NULL,
  month TEXT NOT NULL CHECK (month IN ('April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'January', 'February', 'March')),
  gross NUMERIC(12,2) NOT NULL DEFAULT 0,
  da NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, financial_year, month)
);

-- Parties table
CREATE TABLE IF NOT EXISTS public.parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  gst_no TEXT,
  pan_no TEXT,
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Party transactions table
CREATE TABLE IF NOT EXISTS public.party_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE CASCADE,
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  cpin_no TEXT,
  bill_no TEXT NOT NULL,
  transaction_date DATE NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  cgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  sgst NUMERIC(12,2) NOT NULL DEFAULT 0,
  igst NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_gst NUMERIC(12,2) NOT NULL DEFAULT 0,
  income_tax NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- App config table
CREATE TABLE IF NOT EXISTS public.app_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_id UUID NOT NULL REFERENCES public.offices(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(office_id, key)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employees_office ON public.employees(office_id);
CREATE INDEX IF NOT EXISTS idx_employees_pan ON public.employees(pan);
CREATE INDEX IF NOT EXISTS idx_salaries_employee ON public.employee_salaries(employee_id);
CREATE INDEX IF NOT EXISTS idx_salaries_fy_month ON public.employee_salaries(financial_year, month);
CREATE INDEX IF NOT EXISTS idx_salaries_office ON public.employee_salaries(office_id);
CREATE INDEX IF NOT EXISTS idx_parties_office ON public.parties(office_id);
CREATE INDEX IF NOT EXISTS idx_parties_name ON public.parties(name);
CREATE INDEX IF NOT EXISTS idx_transactions_party ON public.party_transactions(party_id);
CREATE INDEX IF NOT EXISTS idx_transactions_office ON public.party_transactions(office_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.party_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_app_config_office_key ON public.app_config(office_id, key);

-- Comments
COMMENT ON TABLE public.profiles IS 'User profiles extending auth.users';
COMMENT ON TABLE public.offices IS 'Office/district records';
COMMENT ON TABLE public.office_details IS 'Office details for report letterheads';
COMMENT ON TABLE public.employees IS 'Employee master data';
COMMENT ON TABLE public.employee_salaries IS 'Monthly salary records per employee';
COMMENT ON TABLE public.parties IS 'Vendor/party master data';
COMMENT ON TABLE public.party_transactions IS 'Vendor transaction records';
COMMENT ON TABLE public.app_config IS 'Key-value configuration per office';
