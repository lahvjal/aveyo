-- Configurable Google Drive destinations for the Operations hub.
-- Reads and writes are limited to active Operations Managers and admins.
-- Writes use a public RPC backed by a non-exposed SECURITY DEFINER function,
-- which re-checks the actor's protected role, department, and lifecycle state.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE IF NOT EXISTS public.operations_tab_links (
  tab_key TEXT PRIMARY KEY,
  drive_url TEXT,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT operations_tab_links_tab_key_check CHECK (
    tab_key IN ('processes', 'sops', 'field_safety_protocol')
  ),
  CONSTRAINT operations_tab_links_drive_url_check CHECK (
    drive_url IS NULL
    OR (
      char_length(drive_url) <= 2048
      AND drive_url ~ '^https://drive[.]google[.]com/drive(/u/[0-9]+)?/folders/[A-Za-z0-9_-]+/?([?#].*)?$'
    )
  )
);

CREATE INDEX IF NOT EXISTS operations_tab_links_updated_by_idx
  ON public.operations_tab_links(updated_by);

INSERT INTO public.operations_tab_links (tab_key)
VALUES
  ('processes'),
  ('sops'),
  ('field_safety_protocol')
ON CONFLICT (tab_key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.touch_operations_tab_link_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_operations_tab_links_updated_at ON public.operations_tab_links;
CREATE TRIGGER trg_operations_tab_links_updated_at
  BEFORE UPDATE ON public.operations_tab_links
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_operations_tab_link_updated_at();

REVOKE ALL ON FUNCTION public.touch_operations_tab_link_updated_at()
  FROM PUBLIC, anon, authenticated;

ALTER TABLE public.operations_tab_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view Operations tab links"
  ON public.operations_tab_links;
DROP POLICY IF EXISTS "Authorized staff can view Operations tab links"
  ON public.operations_tab_links;
CREATE POLICY "Authorized staff can view Operations tab links"
  ON public.operations_tab_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles actor
      LEFT JOIN public.departments actor_department
        ON actor_department.id = actor.department_id
      WHERE actor.id = (SELECT auth.uid())
        AND COALESCE(actor.employment_status, 'active') = 'active'
        AND COALESCE(actor.onboarding_completed, FALSE) = TRUE
        AND (
          COALESCE(actor.is_admin, FALSE)
          OR COALESCE(actor.is_super_admin, FALSE)
          OR (
            COALESCE(actor.is_manager, FALSE)
            AND lower(trim(COALESCE(actor_department.name, ''))) = 'operations'
          )
        )
    )
  );

-- Supabase may grant table DML through schema defaults. Keep reads available,
-- but require all writes to pass through set_operations_tab_link().
REVOKE ALL ON TABLE public.operations_tab_links FROM anon;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.operations_tab_links FROM authenticated;
GRANT SELECT ON TABLE public.operations_tab_links TO authenticated;

CREATE OR REPLACE FUNCTION private.set_operations_tab_link(
  p_tab_key TEXT,
  p_drive_url TEXT
)
RETURNS public.operations_tab_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_drive_url TEXT := NULLIF(pg_catalog.btrim(p_drive_url), '');
  v_result public.operations_tab_links;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles actor
    LEFT JOIN public.departments actor_department
      ON actor_department.id = actor.department_id
    WHERE actor.id = v_actor_id
      AND COALESCE(actor.employment_status, 'active') = 'active'
      AND COALESCE(actor.onboarding_completed, FALSE) = TRUE
      AND (
        COALESCE(actor.is_admin, FALSE)
        OR COALESCE(actor.is_super_admin, FALSE)
        OR (
          COALESCE(actor.is_manager, FALSE)
          AND lower(trim(COALESCE(actor_department.name, ''))) = 'operations'
        )
      )
  ) THEN
    RAISE EXCEPTION 'Only Operations Managers and admins can manage Operations links.'
      USING ERRCODE = '42501';
  END IF;

  IF p_tab_key IS NULL
     OR p_tab_key NOT IN ('processes', 'sops', 'field_safety_protocol') THEN
    RAISE EXCEPTION 'Unknown Operations tab.' USING ERRCODE = '22023';
  END IF;

  IF v_drive_url IS NOT NULL AND (
    pg_catalog.char_length(v_drive_url) > 2048
    OR v_drive_url !~ '^https://drive[.]google[.]com/drive(/u/[0-9]+)?/folders/[A-Za-z0-9_-]+/?([?#].*)?$'
  ) THEN
    RAISE EXCEPTION 'Enter an HTTPS Google Drive folder URL.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.operations_tab_links (tab_key, drive_url, updated_by)
  VALUES (p_tab_key, v_drive_url, v_actor_id)
  ON CONFLICT (tab_key) DO UPDATE
  SET
    drive_url = EXCLUDED.drive_url,
    updated_by = EXCLUDED.updated_by
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION private.set_operations_tab_link(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.set_operations_tab_link(TEXT, TEXT) TO authenticated;

-- PostgREST exposes this non-privileged wrapper as the stable RPC endpoint.
-- The privileged implementation remains in the non-exposed private schema.
CREATE OR REPLACE FUNCTION public.set_operations_tab_link(
  p_tab_key TEXT,
  p_drive_url TEXT
)
RETURNS public.operations_tab_links
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT private.set_operations_tab_link(p_tab_key, p_drive_url);
$$;

REVOKE ALL ON FUNCTION public.set_operations_tab_link(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_operations_tab_link(TEXT, TEXT) TO authenticated;

COMMENT ON TABLE public.operations_tab_links IS
  'Operations hub links restricted to active Operations Managers and admins.';
COMMENT ON FUNCTION public.set_operations_tab_link(TEXT, TEXT) IS
  'Public RPC wrapper for updating an Operations Google Drive destination.';
COMMENT ON FUNCTION private.set_operations_tab_link(TEXT, TEXT) IS
  'Validates and updates an Operations Google Drive destination after server-side role checks.';
