-- Change payment foreign keys from CASCADE to SET NULL so records persist after member deletion

-- dues_payments
ALTER TABLE public.dues_payments DROP CONSTRAINT dues_payments_user_id_fkey;
ALTER TABLE public.dues_payments ADD CONSTRAINT dues_payments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- event_payments
ALTER TABLE public.event_payments DROP CONSTRAINT event_payments_user_id_fkey;
ALTER TABLE public.event_payments ADD CONSTRAINT event_payments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- donation_payments
ALTER TABLE public.donation_payments DROP CONSTRAINT donation_payments_user_id_fkey;
ALTER TABLE public.donation_payments ADD CONSTRAINT donation_payments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- finance_adjustments (already no cascade, but make explicit SET NULL)
ALTER TABLE public.finance_adjustments DROP CONSTRAINT finance_adjustments_created_by_fkey;
ALTER TABLE public.finance_adjustments ADD CONSTRAINT finance_adjustments_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- manual_payment_records - keep these too
-- First check if FK exists and update
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'manual_payment_records_user_id_fkey') THEN
    ALTER TABLE public.manual_payment_records DROP CONSTRAINT manual_payment_records_user_id_fkey;
  END IF;
END $$;