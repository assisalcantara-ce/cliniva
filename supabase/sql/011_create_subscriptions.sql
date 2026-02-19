-- Migration 011: Create subscriptions table
-- Manages therapy subscription plans for therapists

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id UUID NOT NULL REFERENCES public.therapists(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL, -- 'basic', 'pro', 'enterprise'
  status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'paused', 'cancelled'
  billing_cycle VARCHAR(20) NOT NULL, -- 'monthly', 'yearly'
  amount_cents INTEGER NOT NULL, -- em centavos (ex: 9900 = R$99.00)
  next_billing_date DATE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_therapist_id ON public.subscriptions(therapist_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON public.subscriptions(plan);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_date ON public.subscriptions(next_billing_date);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Therapists can read their own subscription
CREATE POLICY "subscriptions_read_own" ON public.subscriptions
FOR SELECT USING (
  therapist_id IN (
    SELECT id FROM public.therapists WHERE id = auth.uid()
  )
);

-- Only admin can update subscriptions
CREATE POLICY "subscriptions_admin_all" ON public.subscriptions
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.admin_users WHERE id = auth.uid()
));
