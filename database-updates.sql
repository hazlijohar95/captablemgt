-- Database schema updates to match TypeScript types
-- Run this SQL in your Supabase SQL editor to update the database structure

-- Add missing columns to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS incorporation_date DATE,
ADD COLUMN IF NOT EXISTS jurisdiction VARCHAR(100);

-- Add user_id column to people table to link with auth users
ALTER TABLE people 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_people_user_id ON people(user_id);
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);

-- Update companies table defaults
ALTER TABLE companies 
ALTER COLUMN country SET DEFAULT 'US',
ALTER COLUMN currency SET DEFAULT 'USD',
ALTER COLUMN fiscal_year_start SET DEFAULT 1;

-- Add sample data for testing (Demo Startup Inc.)
INSERT INTO companies (id, name, country, currency, incorporation_date, jurisdiction, settings) 
VALUES (
  '01234567-89ab-cdef-0123-456789abcdef',
  'Demo Startup Inc.',
  'US',
  'USD',
  '2023-01-15',
  'Delaware',
  '{
    "valuation": {
      "method": "409A",
      "last_valuation": 10000000,
      "valuation_date": "2024-01-01"
    },
    "options": {
      "pool_size": 0.15,
      "vesting_cliff": 12,
      "vesting_period": 48
    }
  }'
)
ON CONFLICT (id) DO NOTHING;

-- Add sample share classes
INSERT INTO share_classes (id, company_id, name, type, votes_per_share, seniority_rank, liquidation_preference) VALUES
('11111111-1111-1111-1111-111111111111', '01234567-89ab-cdef-0123-456789abcdef', 'Common Stock', 'COMMON', 1, 1, NULL),
('22222222-2222-2222-2222-222222222222', '01234567-89ab-cdef-0123-456789abcdef', 'Series A Preferred', 'PREFERRED', 1, 2, 1.0)
ON CONFLICT (id) DO NOTHING;

-- Add sample founder
INSERT INTO people (id, name, email, user_id) VALUES
('33333333-3333-3333-3333-333333333333', 'Demo Founder', 'founder@demo.com', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stakeholders (id, company_id, person_id, type) VALUES
('44444444-4444-4444-4444-444444444444', '01234567-89ab-cdef-0123-456789abcdef', '33333333-3333-3333-3333-333333333333', 'FOUNDER')
ON CONFLICT (id) DO NOTHING;

-- Add sample securities
INSERT INTO securities (id, company_id, stakeholder_id, class_id, type, quantity, issued_at) VALUES
('55555555-5555-5555-5555-555555555555', '01234567-89ab-cdef-0123-456789abcdef', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'EQUITY', 8000000, '2023-01-15'),
('66666666-6666-6666-6666-666666666666', '01234567-89ab-cdef-0123-456789abcdef', '44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'OPTION', 2000000, '2023-01-15')
ON CONFLICT (id) DO NOTHING;

-- Update the company ID constant for easy reference
-- Demo Startup Inc. ID: 01234567-89ab-cdef-0123-456789abcdef