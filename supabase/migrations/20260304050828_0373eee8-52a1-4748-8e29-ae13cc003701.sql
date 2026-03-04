-- Fix: Add admin role to payment-proofs INSERT policy
-- Drop the existing conflicting policies and recreate clean ones

-- Drop existing INSERT policies for payment-proofs
DROP POLICY IF EXISTS "Users can upload their own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;

-- Create single clean INSERT policy: user's own folder OR admin OR financial_secretary
CREATE POLICY "Users can upload payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_financial_secretary(auth.uid())
  )
);

-- Drop existing SELECT policies for payment-proofs and recreate
DROP POLICY IF EXISTS "Users can view their own payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all payment proofs" ON storage.objects;

-- Single clean SELECT policy
CREATE POLICY "Anyone can view payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_financial_secretary(auth.uid())
  )
);

-- Add UPDATE policy for payment proofs
CREATE POLICY "Users can update payment proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'payment-proofs' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_financial_secretary(auth.uid())
  )
);

-- Add DELETE policy for payment proofs
CREATE POLICY "Users can delete payment proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'payment-proofs' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_financial_secretary(auth.uid())
  )
);