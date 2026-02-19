-- Migration 013: Create support_tickets and ticket_messages tables
-- Help & support system for users to report issues

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'bug', 'feature', 'billing', 'general'
  priority VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status VARCHAR(50) NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  assigned_to UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL, -- can be from users or admin_users
  sender_type VARCHAR(20) NOT NULL, -- 'user' or 'admin'
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  is_internal BOOLEAN DEFAULT false, -- only visible to admin team
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON public.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON public.ticket_messages(created_at);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Users can read their own tickets
CREATE POLICY "support_tickets_read_own" ON public.support_tickets
FOR SELECT USING (user_id = auth.uid());

-- Admin can read all tickets
CREATE POLICY "support_tickets_read_admin" ON public.support_tickets
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.admin_users WHERE id = auth.uid()
));

-- Users can create tickets
CREATE POLICY "support_tickets_insert_own" ON public.support_tickets
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Admin can update tickets
CREATE POLICY "support_tickets_update_admin" ON public.support_tickets
FOR UPDATE USING (EXISTS (
  SELECT 1 FROM public.admin_users WHERE id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.admin_users WHERE id = auth.uid()
));

-- Messages: users can read their own ticket messages
CREATE POLICY "ticket_messages_read_user_own" ON public.ticket_messages
FOR SELECT USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets WHERE user_id = auth.uid()
  ) AND is_internal = false
);

-- Messages: admin can read all messages
CREATE POLICY "ticket_messages_read_admin" ON public.ticket_messages
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.admin_users WHERE id = auth.uid()
));

-- Messages: users can insert messages to their own tickets
CREATE POLICY "ticket_messages_insert_user" ON public.ticket_messages
FOR INSERT WITH CHECK (
  sender_type = 'user' AND
  sender_id = auth.uid() AND
  is_internal = false AND
  ticket_id IN (
    SELECT id FROM public.support_tickets WHERE user_id = auth.uid()
  )
);

-- Messages: admin can insert messages
CREATE POLICY "ticket_messages_insert_admin" ON public.ticket_messages
FOR INSERT WITH CHECK (
  sender_type = 'admin' AND
  sender_id IN (SELECT id FROM public.admin_users WHERE id = auth.uid())
);
