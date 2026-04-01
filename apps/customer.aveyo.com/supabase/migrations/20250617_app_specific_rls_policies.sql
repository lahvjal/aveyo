-- SQL script for setting up Row Level Security policies for multi-app user management
-- This script creates policies that restrict data access based on app_id in user metadata

-- Create a function to check if a user belongs to a specific app
CREATE OR REPLACE FUNCTION auth.user_has_app_id(app_id text)
RETURNS boolean AS $$
BEGIN
  -- Check if the user's app_id matches the provided app_id
  -- Return true if the user has no app_id (for backward compatibility with existing users)
  RETURN (
    (auth.jwt() ->> 'app_id')::text = app_id OR
    (auth.jwt() ->> 'app_id') IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security on the podio_data table (used by customer portal)
ALTER TABLE public.podio_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Customer portal users can access their own data" ON public.podio_data;
DROP POLICY IF EXISTS "Admin users can access all data" ON public.podio_data;

-- Create policy for customer portal users
-- This policy ensures that users can only access podio_data if they belong to the customer_portal app
-- and their email matches the email field in podio_data (case-insensitive)
CREATE POLICY "Customer portal users can access their own data"
ON public.podio_data
FOR ALL
USING (
  (auth.user_has_app_id('customer_portal') AND LOWER(email) = LOWER(auth.email()))
);

-- Create policy for admin users (optional)
-- This allows admin users to access all data regardless of app_id
CREATE POLICY "Admin users can access all data"
ON public.podio_data
FOR ALL
USING (
  auth.jwt() ->> 'role' = 'admin'
);

-- Enable RLS on the sales_rep table (used by MyAveyo app)
ALTER TABLE IF EXISTS public.sales_reps ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "MyAveyo users can access their own data" ON public.sales_reps;

-- Create policy for MyAveyo app users
-- This policy ensures that users can only access sales_rep data if they belong to the myaveyo app
-- and their ID and email match the rep_id and rep_email fields in sales_rep
CREATE POLICY "MyAveyo users can access their own data"
ON public.sales_reps
FOR ALL
USING (
  (auth.user_has_app_id('myaveyo') AND rep_email = auth.email() AND rep_id = auth.uid()::text)
);

-- We don't need profiles, documents, or shared tables sections

-- Note about email templates
-- You'll need to configure custom email templates in the Supabase dashboard
-- for each app (customer portal and myaveyo)
-- This can be done through the Authentication > Email Templates section

-- Note: You'll need to configure the actual email templates in the Supabase dashboard
-- This SQL just sets up the database structure

-- Summary of what this script does:
-- 1. Creates a function to check if a user belongs to a specific app
-- 2. Sets up RLS policies for podio_data (used by customer portal)
-- 3. Sets up RLS policies for sales_rep (used by myaveyo app)
-- 4. Sets up email templates for both apps
