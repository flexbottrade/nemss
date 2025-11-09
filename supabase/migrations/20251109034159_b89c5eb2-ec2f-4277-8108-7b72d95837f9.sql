-- Add DELETE policies for admins on payment tables

-- Allow admins to delete dues payments
CREATE POLICY "Only admins can delete dues payments"
ON public.dues_payments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete event payments
CREATE POLICY "Only admins can delete event payments"
ON public.event_payments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete donation payments
CREATE POLICY "Only admins can delete donation payments"
ON public.donation_payments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));