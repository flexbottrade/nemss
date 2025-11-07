-- Create donations table
CREATE TABLE IF NOT EXISTS public.donations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  minimum_amount NUMERIC NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create donation_payments table
CREATE TABLE IF NOT EXISTS public.donation_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  donation_id UUID REFERENCES public.donations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_proof_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create variable_dues_settings table for year-specific dues amounts
CREATE TABLE IF NOT EXISTS public.variable_dues_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  monthly_amount NUMERIC NOT NULL,
  is_waived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create manual_payment_records table to track admin manual payments
CREATE TABLE IF NOT EXISTS public.manual_payment_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_type TEXT NOT NULL, -- 'dues', 'event', 'donation'
  reference_id UUID, -- references the specific payment record
  admin_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variable_dues_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_payment_records ENABLE ROW LEVEL SECURITY;

-- Donations policies
CREATE POLICY "Anyone can view active donations"
  ON public.donations FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can manage donations"
  ON public.donations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Donation payments policies
CREATE POLICY "Users can view own donation payments"
  ON public.donation_payments FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create own donation payments"
  ON public.donation_payments FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Only admins can update donation payments"
  ON public.donation_payments FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Variable dues settings policies
CREATE POLICY "Anyone can view dues settings"
  ON public.variable_dues_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage dues settings"
  ON public.variable_dues_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Manual payment records policies
CREATE POLICY "Only admins can view manual payment records"
  ON public.manual_payment_records FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can create manual payment records"
  ON public.manual_payment_records FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_donations_updated_at
  BEFORE UPDATE ON public.donations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_donation_payments_updated_at
  BEFORE UPDATE ON public.donation_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_variable_dues_settings_updated_at
  BEFORE UPDATE ON public.variable_dues_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert initial variable dues settings for 2023-2026
INSERT INTO public.variable_dues_settings (year, monthly_amount, is_waived) VALUES
  (2023, 500, false),
  (2024, 1000, false),
  (2025, 0, true),
  (2026, 1000, false)
ON CONFLICT (year) DO NOTHING;

-- Add is_manually_updated flag to existing payment tables
ALTER TABLE public.dues_payments ADD COLUMN IF NOT EXISTS is_manually_updated BOOLEAN DEFAULT false;
ALTER TABLE public.event_payments ADD COLUMN IF NOT EXISTS is_manually_updated BOOLEAN DEFAULT false;