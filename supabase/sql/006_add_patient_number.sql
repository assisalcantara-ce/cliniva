-- Migration 006: Add sequential patient number
-- This adds a unique sequential number (1, 2, 3...) per therapist for easy patient identification

-- Add patient_number column to patients table
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS patient_number INTEGER;

-- Create unique composite index (therapist_id, patient_number)
CREATE UNIQUE INDEX IF NOT EXISTS idx_patients_therapist_number 
ON public.patients(therapist_id, patient_number) WHERE patient_number IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.patients.patient_number IS 'Sequential number (1, 2, 3...) unique per therapist for easy patient identification';

-- For existing patients, assign sequential numbers
-- This will assign numbers based on creation order
WITH numbered_patients AS (
  SELECT 
    id,
    therapist_id,
    ROW_NUMBER() OVER (PARTITION BY therapist_id ORDER BY created_at ASC) as seq_num
  FROM public.patients
  WHERE patient_number IS NULL
)
UPDATE public.patients p
SET patient_number = np.seq_num
FROM numbered_patients np
WHERE p.id = np.id;
