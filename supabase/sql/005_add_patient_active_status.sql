-- Migration 005: Add is_active status to patients table
-- This allows soft-deleting patients instead of permanently deleting them

-- Add is_active column to patients table (default: true for existing records)
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create index for efficient filtering by active status
CREATE INDEX IF NOT EXISTS idx_patients_is_active 
ON public.patients(is_active);

-- Create composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_patients_therapist_active 
ON public.patients(therapist_id, is_active);

-- Update the handlePatientUpdate trigger to set updated_at on soft-deletes
-- (if such a trigger exists), or create a basic audit comment
COMMENT ON COLUMN public.patients.is_active IS 'Soft delete flag - false means patient is inactive/archived, true means active';

-- List current schema
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'patients';
