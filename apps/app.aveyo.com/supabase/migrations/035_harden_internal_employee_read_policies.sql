-- Shared-auth hardening:
-- Restrict internal org/process/KPI reads to active employee accounts only.
-- This prevents newly-added customer identities from reading internal datasets.

-- -----------------------------------------------------------------------------
-- Guard helper RPCs used by internal app
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_profile_branch(user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  preferred_name TEXT,
  job_title TEXT,
  job_description TEXT,
  start_date DATE,
  profile_photo_url TEXT,
  phone TEXT,
  location TEXT,
  department_id UUID,
  manager_id UUID,
  social_links JSONB,
  is_admin BOOLEAN,
  is_manager BOOLEAN,
  is_executive BOOLEAN,
  is_super_admin BOOLEAN,
  is_process_editor BOOLEAN,
  onboarding_completed BOOLEAN,
  employment_status TEXT,
  terminated_at TIMESTAMPTZ,
  termination_effective_at TIMESTAMPTZ,
  termination_reason TEXT,
  terminated_by UUID,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_employee_user(auth.uid()) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH RECURSIVE branch AS (
    SELECT
      p.id,
      p.email,
      p.full_name,
      p.preferred_name,
      p.job_title,
      p.job_description,
      p.start_date,
      p.profile_photo_url,
      p.phone,
      p.location,
      p.department_id,
      p.manager_id,
      p.social_links,
      p.is_admin,
      p.is_manager,
      p.is_executive,
      p.is_super_admin,
      p.is_process_editor,
      p.onboarding_completed,
      p.employment_status,
      p.terminated_at,
      p.termination_effective_at,
      p.termination_reason,
      p.terminated_by,
      p.archived_at,
      p.created_at,
      p.updated_at
    FROM public.profiles p
    WHERE p.id = user_id

    UNION

    SELECT
      p.id,
      p.email,
      p.full_name,
      p.preferred_name,
      p.job_title,
      p.job_description,
      p.start_date,
      p.profile_photo_url,
      p.phone,
      p.location,
      p.department_id,
      p.manager_id,
      p.social_links,
      p.is_admin,
      p.is_manager,
      p.is_executive,
      p.is_super_admin,
      p.is_process_editor,
      p.onboarding_completed,
      p.employment_status,
      p.terminated_at,
      p.termination_effective_at,
      p.termination_reason,
      p.terminated_by,
      p.archived_at,
      p.created_at,
      p.updated_at
    FROM public.profiles p
    INNER JOIN branch b ON p.manager_id = b.id
  )
  SELECT * FROM branch;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_manager_team(p_manager_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  preferred_name TEXT,
  job_title TEXT,
  job_description TEXT,
  start_date DATE,
  profile_photo_url TEXT,
  phone TEXT,
  location TEXT,
  department_id UUID,
  manager_id UUID,
  social_links JSONB,
  is_admin BOOLEAN,
  is_manager BOOLEAN,
  onboarding_completed BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_employee_user(auth.uid()) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH RECURSIVE team AS (
    SELECT
      p.id,
      p.email,
      p.full_name,
      p.preferred_name,
      p.job_title,
      p.job_description,
      p.start_date,
      p.profile_photo_url,
      p.phone,
      p.location,
      p.department_id,
      p.manager_id,
      p.social_links,
      p.is_admin,
      p.is_manager,
      p.onboarding_completed,
      p.created_at,
      p.updated_at
    FROM public.profiles p
    WHERE p.manager_id = p_manager_id

    UNION

    SELECT
      p.id,
      p.email,
      p.full_name,
      p.preferred_name,
      p.job_title,
      p.job_description,
      p.start_date,
      p.profile_photo_url,
      p.phone,
      p.location,
      p.department_id,
      p.manager_id,
      p.social_links,
      p.is_admin,
      p.is_manager,
      p.onboarding_completed,
      p.created_at,
      p.updated_at
    FROM public.profiles p
    INNER JOIN team t ON p.manager_id = t.id
  )
  SELECT * FROM team;
END;
$$;

-- -----------------------------------------------------------------------------
-- Internal read policies: employee-only
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_employee_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;
CREATE POLICY "Authenticated users can view departments"
  ON public.departments FOR SELECT
  TO authenticated
  USING (public.is_employee_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view processes" ON public.processes;
CREATE POLICY "Authenticated users can view processes"
  ON public.processes FOR SELECT
  TO authenticated
  USING (public.is_employee_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view process nodes" ON public.process_nodes;
CREATE POLICY "Authenticated users can view process nodes"
  ON public.process_nodes FOR SELECT
  TO authenticated
  USING (public.is_employee_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view process edges" ON public.process_edges;
CREATE POLICY "Authenticated users can view process edges"
  ON public.process_edges FOR SELECT
  TO authenticated
  USING (public.is_employee_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read all KPIs" ON public.custom_kpis;
CREATE POLICY "Authenticated can read all KPIs"
  ON public.custom_kpis FOR SELECT
  TO authenticated
  USING (public.is_employee_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read goals" ON public.goals;
CREATE POLICY "Authenticated can read goals"
  ON public.goals FOR SELECT
  TO authenticated
  USING (public.is_employee_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read section order" ON public.section_order;
CREATE POLICY "Authenticated can read section order"
  ON public.section_order FOR SELECT
  TO authenticated
  USING (public.is_employee_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read process edit locks" ON public.process_edit_locks;
CREATE POLICY "Authenticated can read process edit locks"
  ON public.process_edit_locks FOR SELECT
  TO authenticated
  USING (public.is_employee_user(auth.uid()));

DROP POLICY IF EXISTS "Anyone authenticated can view organization settings" ON public.organization_settings;
CREATE POLICY "Anyone authenticated can view organization settings"
  ON public.organization_settings FOR SELECT
  TO authenticated
  USING (public.is_employee_user(auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can view non-expired share links" ON public.share_links;
CREATE POLICY "Authenticated users can view non-expired share links"
  ON public.share_links FOR SELECT
  TO authenticated
  USING (
    public.is_employee_user(auth.uid())
    AND (expires_at IS NULL OR expires_at > NOW())
  );
