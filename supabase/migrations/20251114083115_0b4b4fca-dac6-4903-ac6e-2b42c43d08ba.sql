-- Update RLS policies to allow financial secretaries to view all payments

-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Users can view own payments" ON dues_payments;
DROP POLICY IF EXISTS "Users can view own event payments" ON event_payments;
DROP POLICY IF EXISTS "Users can view own donation payments" ON donation_payments;

-- Create new SELECT policies that include financial secretary role
CREATE POLICY "Users can view own payments"
ON dues_payments
FOR SELECT
USING (
  (user_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'financial_secretary'::app_role)
);

CREATE POLICY "Users can view own event payments"
ON event_payments
FOR SELECT
USING (
  (user_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'financial_secretary'::app_role)
);

CREATE POLICY "Users can view own donation payments"
ON donation_payments
FOR SELECT
USING (
  (user_id = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'financial_secretary'::app_role)
);