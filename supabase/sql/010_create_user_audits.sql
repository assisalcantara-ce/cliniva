-- Migration 010: Create user_audits table
-- Tracks logins, logouts, and other user actions for security

CREATE TABLE IF NOT EXISTS public.user_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'login', 'logout', 'password_change', 'data_access'
  ip_address VARCHAR(50),
  user_agent TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_audits_user_id ON public.user_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_audits_timestamp ON public.user_audits(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_audits_action ON public.user_audits(action);

-- Enable RLS
ALTER TABLE public.user_audits ENABLE ROW LEVEL SECURITY;

-- Admin users can read audits
CREATE POLICY "user_audits_read_admin" ON public.user_audits
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.admin_users WHERE id = auth.uid()
));

-- Users can read their own audits
CREATE POLICY "user_audits_read_own" ON public.user_audits
FOR SELECT USING (
  user_id IN (
    SELECT id FROM public.users WHERE id = auth.uid()
  )
);
