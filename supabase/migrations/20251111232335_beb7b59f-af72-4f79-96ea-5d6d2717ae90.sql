-- Create table for payment alert recipient numbers
CREATE TABLE public.alert_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alert_recipients ENABLE ROW LEVEL SECURITY;

-- Only admins can manage alert recipients
CREATE POLICY "Only admins can manage alert recipients"
ON public.alert_recipients
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view alert recipients (needed for the edge function)
CREATE POLICY "Anyone can view alert recipients"
ON public.alert_recipients
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_alert_recipients_updated_at
BEFORE UPDATE ON public.alert_recipients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default recipient
INSERT INTO public.alert_recipients (phone_number)
VALUES ('+2347069423623');