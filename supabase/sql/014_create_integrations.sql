-- Migration 014: Create integrations and integration_logs tables
-- Manage external service integrations (Asaas, Stripe, etc)

CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL UNIQUE, -- 'asaas', 'stripe', etc
  config BYTEA, -- encrypted credentials
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP WITH TIME ZONE,
  webhook_url VARCHAR(500),
  webhook_secret VARCHAR(255),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES public.integrations(id) ON DELETE CASCADE,
  event VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'success', 'error', 'pending'
  request_data JSONB,
  response_data JSONB,
  error_message TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON public.integrations(provider);
CREATE INDEX IF NOT EXISTS idx_integrations_is_active ON public.integrations(is_active);

CREATE INDEX IF NOT EXISTS idx_integration_logs_integration_id ON public.integration_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status ON public.integration_logs(status);
CREATE INDEX IF NOT EXISTS idx_integration_logs_timestamp ON public.integration_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_integration_logs_event ON public.integration_logs(event);

-- Enable RLS
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

-- Only admin can read integrations (sensitive data)
CREATE POLICY "integrations_read_admin" ON public.integrations
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.admin_users WHERE id = auth.uid()
));

-- Only admin can manage integrations
CREATE POLICY "integrations_all_admin" ON public.integrations
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.admin_users WHERE id = auth.uid()
));

-- Only admin can read integration logs
CREATE POLICY "integration_logs_read_admin" ON public.integration_logs
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.admin_users WHERE id = auth.uid()
));

-- System can insert logs
CREATE POLICY "integration_logs_insert_system" ON public.integration_logs
FOR INSERT WITH CHECK (true);
