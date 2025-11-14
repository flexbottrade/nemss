-- Consolidate existing manually updated dues payments into single transactions
-- This will combine multiple month-by-month manual payments into single records

-- Create a temporary function to consolidate payments
CREATE OR REPLACE FUNCTION consolidate_manual_dues_payments()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  payment_record RECORD;
  consecutive_payments RECORD;
BEGIN
  -- Find all manually updated payments grouped by user and year
  FOR payment_record IN 
    SELECT DISTINCT user_id, start_year
    FROM public.dues_payments
    WHERE is_manually_updated = true
    AND status = 'approved'
    ORDER BY user_id, start_year
  LOOP
    -- For each user and year, find consecutive month groups
    FOR consecutive_payments IN
      WITH ordered_payments AS (
        SELECT 
          id,
          user_id,
          start_year,
          start_month,
          amount,
          created_at,
          ROW_NUMBER() OVER (ORDER BY start_month) as rn,
          start_month - ROW_NUMBER() OVER (ORDER BY start_month) as grp
        FROM public.dues_payments
        WHERE user_id = payment_record.user_id
        AND start_year = payment_record.start_year
        AND is_manually_updated = true
        AND status = 'approved'
        AND months_paid = 1
      )
      SELECT 
        (ARRAY_AGG(id ORDER BY start_month))[1] as first_id,
        MIN(start_month) as start_month,
        COUNT(*) as month_count,
        SUM(amount) as total_amount,
        MIN(created_at) as earliest_created
      FROM ordered_payments
      GROUP BY grp
      HAVING COUNT(*) > 1
    LOOP
      -- Update the first payment in the group to represent all months
      UPDATE public.dues_payments
      SET 
        months_paid = consecutive_payments.month_count,
        amount = consecutive_payments.total_amount,
        start_month = consecutive_payments.start_month
      WHERE id = consecutive_payments.first_id;
      
      -- Delete the other payments in this consecutive group
      DELETE FROM public.dues_payments
      WHERE user_id = payment_record.user_id
      AND start_year = payment_record.start_year
      AND is_manually_updated = true
      AND status = 'approved'
      AND months_paid = 1
      AND start_month >= consecutive_payments.start_month
      AND start_month < consecutive_payments.start_month + consecutive_payments.month_count
      AND id != consecutive_payments.first_id;
    END LOOP;
  END LOOP;
END;
$$;

-- Execute the consolidation
SELECT consolidate_manual_dues_payments();

-- Drop the temporary function
DROP FUNCTION consolidate_manual_dues_payments();