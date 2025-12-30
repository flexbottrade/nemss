-- Create member_waivers table for individual member due and event waivers
CREATE TABLE public.member_waivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    waiver_type TEXT NOT NULL CHECK (waiver_type IN ('dues', 'event')),
    -- For dues waivers
    year INTEGER,
    months INTEGER[], -- Array of months (1-12)
    -- For event waivers
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.member_waivers ENABLE ROW LEVEL SECURITY;

-- Only financial secretaries can manage waivers
CREATE POLICY "Financial secretaries can view all waivers"
ON public.member_waivers
FOR SELECT
USING (is_financial_secretary(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Financial secretaries can create waivers"
ON public.member_waivers
FOR INSERT
WITH CHECK (is_financial_secretary(auth.uid()));

CREATE POLICY "Financial secretaries can update waivers"
ON public.member_waivers
FOR UPDATE
USING (is_financial_secretary(auth.uid()));

CREATE POLICY "Financial secretaries can delete waivers"
ON public.member_waivers
FOR DELETE
USING (is_financial_secretary(auth.uid()));

-- Create indexes for better query performance
CREATE INDEX idx_member_waivers_user_id ON public.member_waivers(user_id);
CREATE INDEX idx_member_waivers_waiver_type ON public.member_waivers(waiver_type);
CREATE INDEX idx_member_waivers_event_id ON public.member_waivers(event_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_member_waivers_updated_at
BEFORE UPDATE ON public.member_waivers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();