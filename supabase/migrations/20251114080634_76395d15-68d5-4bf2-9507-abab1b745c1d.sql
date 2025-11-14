-- Add financial_secretary to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'financial_secretary';