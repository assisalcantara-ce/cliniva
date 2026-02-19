-- Migration 012: Create invoices table
-- Tracks billing invoices for subscriptions (integrated with Asaas)

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  external_id VARCHAR(255), -- ID from Asaas payment gateway
  amount_cents INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'draft', 'pending', 'paid', 'overdue', 'cancelled'
  payment_method VARCHAR(50), -- 'credit_card', 'pix', 'boleto'
  due_date DATE NOT NULL,
  paid_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_external_id ON public.invoices(external_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Therapists can read their own invoices
CREATE POLICY "invoices_read_own" ON public.invoices
FOR SELECT USING (
  subscription_id IN (
    SELECT id FROM public.subscriptions 
    WHERE therapist_id IN (
      SELECT id FROM public.therapists WHERE id = auth.uid()
    )
  )
);

-- Only admin can manage invoices
CREATE POLICY "invoices_admin_all" ON public.invoices
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.admin_users WHERE id = auth.uid()
));
