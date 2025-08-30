-- Create 409A valuations table for compliance tracking
CREATE TABLE IF NOT EXISTS public.valuations_409a (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  valuation_date DATE NOT NULL,
  fair_market_value BIGINT NOT NULL, -- FMV per share in cents
  preferred_price BIGINT, -- Latest preferred price in cents if applicable
  method VARCHAR(50) NOT NULL CHECK (method IN ('409A', 'MARKET_APPROACH', 'INCOME_APPROACH', 'ASSET_APPROACH', 'SAFE_HARBOR')),
  valid_through DATE NOT NULL,
  report_url TEXT,
  provider VARCHAR(255), -- Valuation provider name
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'EXPIRED', 'SUPERSEDED')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_valuations_company_status (company_id, status),
  INDEX idx_valuations_valuation_date (valuation_date DESC),
  
  -- Ensure only one active valuation per company
  UNIQUE (company_id, status) WHERE status = 'ACTIVE'
);

-- Enable RLS
ALTER TABLE public.valuations_409a ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view valuations for companies they have access to
CREATE POLICY "Users can view company valuations" ON public.valuations_409a
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.people p ON p.id = ra.person_id
      WHERE ra.company_id = valuations_409a.company_id
      AND p.user_id = auth.uid()
    )
  );

-- RLS Policy: Only admins can create/update valuations
CREATE POLICY "Admins can manage valuations" ON public.valuations_409a
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.role_assignments ra
      JOIN public.people p ON p.id = ra.person_id
      WHERE ra.company_id = valuations_409a.company_id
      AND p.user_id = auth.uid()
      AND ra.role IN ('OWNER', 'ADMIN')
    )
  );

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_valuations_409a_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_valuations_409a_updated_at_trigger
  BEFORE UPDATE ON public.valuations_409a
  FOR EACH ROW
  EXECUTE FUNCTION update_valuations_409a_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.valuations_409a IS '409A valuations for strike price compliance';
COMMENT ON COLUMN public.valuations_409a.fair_market_value IS 'Fair market value per share in cents';
COMMENT ON COLUMN public.valuations_409a.method IS 'Valuation methodology used';
COMMENT ON COLUMN public.valuations_409a.valid_through IS 'Date when valuation expires (typically 12 months)';
COMMENT ON COLUMN public.valuations_409a.status IS 'Current status of the valuation';