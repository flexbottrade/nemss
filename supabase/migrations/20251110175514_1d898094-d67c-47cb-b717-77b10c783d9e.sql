-- Drop old policies for event_payments
DROP POLICY IF EXISTS "Users can view own event payments" ON event_payments;

-- Create new policy using has_role function
CREATE POLICY "Users can view own event payments" 
ON event_payments 
FOR SELECT 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Drop old policies for dues_payments
DROP POLICY IF EXISTS "Users can view own payments" ON dues_payments;

-- Create new policy using has_role function
CREATE POLICY "Users can view own payments" 
ON dues_payments 
FOR SELECT 
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));