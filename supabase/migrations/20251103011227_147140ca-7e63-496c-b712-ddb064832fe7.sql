-- Fix RLS policies to use user_roles table instead of profiles.role

-- Payment Accounts
DROP POLICY IF EXISTS "Only admins can manage payment accounts" ON public.payment_accounts;
CREATE POLICY "Only admins can manage payment accounts"
ON public.payment_accounts
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Events
DROP POLICY IF EXISTS "Only admins can manage events" ON public.events;
CREATE POLICY "Only admins can manage events"
ON public.events
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Finance Adjustments
DROP POLICY IF EXISTS "Admins can create adjustments" ON public.finance_adjustments;
DROP POLICY IF EXISTS "Admins can view all adjustments" ON public.finance_adjustments;

CREATE POLICY "Admins can create adjustments"
ON public.finance_adjustments
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all adjustments"
ON public.finance_adjustments
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Elections
DROP POLICY IF EXISTS "Only admins can manage elections" ON public.elections;
CREATE POLICY "Only admins can manage elections"
ON public.elections
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Election Nominees
DROP POLICY IF EXISTS "Only admins can manage nominees" ON public.election_nominees;
CREATE POLICY "Only admins can manage nominees"
ON public.election_nominees
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Dues Payments (admin update)
DROP POLICY IF EXISTS "Only admins can update payments" ON public.dues_payments;
CREATE POLICY "Only admins can update payments"
ON public.dues_payments
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Event Payments (admin update)
DROP POLICY IF EXISTS "Only admins can update event payments" ON public.event_payments;
CREATE POLICY "Only admins can update event payments"
ON public.event_payments
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Settings
DROP POLICY IF EXISTS "Only admins can update settings" ON public.settings;
CREATE POLICY "Only admins can update settings"
ON public.settings
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Votes (admin view)
DROP POLICY IF EXISTS "Admins can view all votes" ON public.votes;
CREATE POLICY "Admins can view all votes"
ON public.votes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Contact Messages (admin view)
DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contact_messages;
CREATE POLICY "Admins can view contact messages"
ON public.contact_messages
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));