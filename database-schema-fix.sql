-- Fix for missing columns in companies table
-- Run this SQL in your Supabase SQL editor to add missing columns

-- Add missing columns to companies table if they don't exist
DO $$ 
BEGIN
    -- Add incorporation_date column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'incorporation_date'
    ) THEN
        ALTER TABLE companies ADD COLUMN incorporation_date DATE;
    END IF;

    -- Add jurisdiction column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'companies' 
        AND column_name = 'jurisdiction'
    ) THEN
        ALTER TABLE companies ADD COLUMN jurisdiction VARCHAR(100);
    END IF;

    -- Add user_id column to people table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'people' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE people ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_people_user_id ON people(user_id);
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);

-- Update companies table defaults to match what the app expects
ALTER TABLE companies 
ALTER COLUMN country SET DEFAULT 'US',
ALTER COLUMN currency SET DEFAULT 'USD',
ALTER COLUMN fiscal_year_start SET DEFAULT 1;