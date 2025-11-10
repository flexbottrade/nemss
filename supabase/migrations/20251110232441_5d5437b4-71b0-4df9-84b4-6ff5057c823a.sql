-- Create message_logs table for WhatsApp notification logging
CREATE TABLE public.message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_type TEXT NOT NULL,
  payment_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  whatsapp_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.message_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view message logs
CREATE POLICY "Only admins can view message logs"
ON public.message_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert logs (via service role)
CREATE POLICY "System can insert message logs"
ON public.message_logs
FOR INSERT
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_message_logs_updated_at
BEFORE UPDATE ON public.message_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();