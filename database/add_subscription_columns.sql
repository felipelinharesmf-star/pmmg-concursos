-- Add subscription tracking columns to user_profiles table

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status text CHECK (subscription_status IN ('active', 'pending', 'cancelled', 'paused', 'expired')),
ADD COLUMN IF NOT EXISTS subscription_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS customer_id text;

-- Create an index for faster lookups on status/end_date if we query active subs later
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription ON user_profiles(subscription_status, subscription_end_date);

-- Comment on columns for clarity
COMMENT ON COLUMN user_profiles.subscription_id IS 'ID reference from the payment gateway (e.g., Mercado Pago ID)';
COMMENT ON COLUMN user_profiles.subscription_status IS 'Current status of the subscription';
COMMENT ON COLUMN user_profiles.subscription_end_date IS 'When the premium access expires';
COMMENT ON COLUMN user_profiles.customer_id IS 'Customer references in the payment gateway';
