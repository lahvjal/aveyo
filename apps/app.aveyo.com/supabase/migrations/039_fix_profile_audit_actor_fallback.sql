-- Prevent profile-update audit logging from failing when auth.uid() is NULL.
-- This happens for SQL-editor/service-role updates where no JWT user is attached.
CREATE OR REPLACE FUNCTION public.log_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID;
BEGIN
  v_actor := COALESCE(auth.uid(), NEW.id, OLD.id);

  INSERT INTO public.audit_logs (action, profile_id, changed_by, changes)
  VALUES (
    'profile_updated',
    NEW.id,
    v_actor,
    jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    )
  );

  RETURN NEW;
END;
$$;
