-- Migration 007: Create organizations table for multi-tenant support
-- This table stores company/organization information

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  website VARCHAR(255),
  logo_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add organization_id to therapists table
ALTER TABLE public.therapists
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add professional details to therapists table
ALTER TABLE public.therapists
ADD COLUMN IF NOT EXISTS crp VARCHAR(20),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS state VARCHAR(2),
ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS photo_url VARCHAR(500),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for organization lookups
CREATE INDEX IF NOT EXISTS idx_therapists_organization_id 
ON public.therapists(organization_id);

-- Create index for active therapists
CREATE INDEX IF NOT EXISTS idx_therapists_active 
ON public.therapists(is_active);

-- Set RLS policies
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organizations_read_all" ON public.organizations
FOR SELECT USING (true);

CREATE POLICY "organizations_insert_authenticated" ON public.organizations
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
