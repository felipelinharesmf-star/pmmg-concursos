-- PROTECT DATA INTEGRITY
-- This trigger ensures that users cannot manually update their own subscription status or admin privileges
-- These columns should only be updated by the Service Role (e.g., via Edge Functions or Admin Dashboard)

CREATE OR REPLACE FUNCTION public.protect_sensitive_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user is trying to modify sensitive columns
  IF (NEW.is_admin IS DISTINCT FROM OLD.is_admin) OR
     (NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan) OR
     (NEW.subscription_status IS DISTINCT FROM OLD.subscription_status) OR
     (NEW.subscription_end_date IS DISTINCT FROM OLD.subscription_end_date) OR
     (NEW.customer_id IS DISTINCT FROM OLD.customer_id) OR
     (NEW.subscription_id IS DISTINCT FROM OLD.subscription_id) THEN
     
     -- Allow if it's the service_role (Admin/Backend)
     IF (auth.jwt() ->> 'role') = 'service_role' THEN
        RETURN NEW;
     END IF;

     -- OPTION 1: Raise Error (Aggressive)
     -- RAISE EXCEPTION 'You are not authorized to update subscription or admin details directly.';

     -- OPTION 2: Silently revert sensitive changes (Passive/Safer for UI)
     -- We revert the sensitive columns to their old values, effective ignoring the user's attempt to change them
     NEW.is_admin := OLD.is_admin;
     NEW.subscription_plan := OLD.subscription_plan;
     NEW.subscription_status := OLD.subscription_status;
     NEW.subscription_end_date := OLD.subscription_end_date;
     NEW.customer_id := OLD.customer_id;
     NEW.subscription_id := OLD.subscription_id;
     
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to allow re-running script
DROP TRIGGER IF EXISTS protect_sensitive_updates ON public.user_profiles;

-- Create the trigger
CREATE TRIGGER protect_sensitive_updates
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_sensitive_columns();
