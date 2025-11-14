-- Allow financial_secretary to manage finance adjustments
DROP POLICY IF EXISTS "Admins can create adjustments" ON public.finance_adjustments;
DROP POLICY IF EXISTS "Admins can view all adjustments" ON public.finance_adjustments;

CREATE POLICY "Admins and financial secretaries can create adjustments"
ON public.finance_adjustments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR is_financial_secretary(auth.uid()));

CREATE POLICY "Admins and financial secretaries can view all adjustments"
ON public.finance_adjustments
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR is_financial_secretary(auth.uid()));

-- Allow admins and financial secretaries to insert manual payments for other users
DROP POLICY IF EXISTS "Users can create own payments" ON public.dues_payments;
DROP POLICY IF EXISTS "Users can create own event payments" ON public.event_payments;
DROP POLICY IF EXISTS "Users can create own donation payments" ON public.donation_payments;

CREATE POLICY "Users can create own payments or admins/financial secretaries can create for others"
ON public.dues_payments
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR is_financial_secretary(auth.uid())
);

CREATE POLICY "Users can create own event payments or admins/financial secretaries can create for others"
ON public.event_payments
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR is_financial_secretary(auth.uid())
);

CREATE POLICY "Users can create own donation payments or admins/financial secretaries can create for others"
ON public.donation_payments
FOR INSERT
WITH CHECK (
  user_id = auth.uid() 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR is_financial_secretary(auth.uid())
);