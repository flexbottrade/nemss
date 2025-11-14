-- Update RLS policies to allow financial_secretary to update payments

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Only admins can update payments" ON public.dues_payments;
DROP POLICY IF EXISTS "Only admins can update event payments" ON public.event_payments;
DROP POLICY IF EXISTS "Only admins can update donation payments" ON public.donation_payments;

-- Create new policies that include financial_secretary role
CREATE POLICY "Admins and financial secretaries can update payments"
ON public.dues_payments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR is_financial_secretary(auth.uid()));

CREATE POLICY "Admins and financial secretaries can update event payments"
ON public.event_payments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR is_financial_secretary(auth.uid()));

CREATE POLICY "Admins and financial secretaries can update donation payments"
ON public.donation_payments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR is_financial_secretary(auth.uid()));