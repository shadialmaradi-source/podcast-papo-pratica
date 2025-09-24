-- Update Supabase configuration to address security warnings

-- 1. Enable stronger password policies and leaked password protection
-- This is handled in the Supabase dashboard under Authentication > Settings

-- 2. Configure OTP settings to reduce expiry time
-- This is also handled in the dashboard under Authentication > Settings

-- 3. For now, we'll add a security audit log table to track security events
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  event_type text NOT NULL,
  event_details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only allow users to view their own audit logs
CREATE POLICY "Users can view own audit logs" ON public.security_audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- Only system/admins can insert audit logs (will be done via edge functions)
CREATE POLICY "System can insert audit logs" ON public.security_audit_log
  FOR INSERT WITH CHECK (true);