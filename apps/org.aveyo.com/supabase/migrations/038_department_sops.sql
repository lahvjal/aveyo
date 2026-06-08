-- Department SOPs: slugs for human-readable routes and per-department document links.

ALTER TABLE public.departments
  ADD COLUMN IF NOT EXISTS slug TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_slug
  ON public.departments (slug)
  WHERE slug IS NOT NULL;

CREATE OR REPLACE FUNCTION public.slugify_department_name(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    trim(both '-' from lower(regexp_replace(trim(coalesce(p_name, '')), '[^a-zA-Z0-9]+', '-', 'g'))),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_unique_department_slug(
  p_base TEXT,
  p_exclude_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  candidate TEXT;
  suffix INTEGER := 2;
BEGIN
  candidate := coalesce(nullif(trim(p_base), ''), 'department');

  WHILE EXISTS (
    SELECT 1
    FROM public.departments d
    WHERE d.slug = candidate
      AND (p_exclude_id IS NULL OR d.id <> p_exclude_id)
  ) LOOP
    candidate := p_base || '-' || suffix::TEXT;
    suffix := suffix + 1;
  END LOOP;

  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_department_slug_from_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
BEGIN
  IF TG_OP = 'INSERT' OR NEW.name IS DISTINCT FROM OLD.name OR NEW.slug IS NULL THEN
    base_slug := public.slugify_department_name(NEW.name);
    NEW.slug := public.ensure_unique_department_slug(base_slug, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_departments_set_slug ON public.departments;
CREATE TRIGGER trg_departments_set_slug
  BEFORE INSERT OR UPDATE OF name, slug ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_department_slug_from_name();

-- Backfill slugs for existing departments via the slug trigger.
UPDATE public.departments
SET name = name
WHERE slug IS NULL;

CREATE TABLE IF NOT EXISTS public.department_sop_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT department_sop_documents_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT department_sop_documents_url_not_blank CHECK (length(trim(url)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_department_sop_documents_department_id
  ON public.department_sop_documents (department_id);

CREATE INDEX IF NOT EXISTS idx_department_sop_documents_sort_order
  ON public.department_sop_documents (department_id, sort_order, created_at);

CREATE OR REPLACE FUNCTION public.can_manage_department_sops(
  p_user_id UUID,
  p_department_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.is_admin_like(p_user_id)
    OR EXISTS (
      SELECT 1
      FROM public.profiles actor
      WHERE actor.id = p_user_id
        AND actor.is_manager = TRUE
        AND actor.department_id IS NOT NULL
        AND p_department_id IN (
          WITH RECURSIVE descendants AS (
            SELECT d.id
            FROM public.departments d
            WHERE d.id = actor.department_id
            UNION ALL
            SELECT child.id
            FROM public.departments child
            INNER JOIN descendants parent ON child.parent_id = parent.id
          )
          SELECT id FROM descendants
        )
    );
$$;

REVOKE ALL ON FUNCTION public.can_manage_department_sops(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_department_sops(UUID, UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.touch_department_sop_document_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_department_sop_documents_updated_at ON public.department_sop_documents;
CREATE TRIGGER trg_department_sop_documents_updated_at
  BEFORE UPDATE ON public.department_sop_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_department_sop_document_updated_at();

ALTER TABLE public.department_sop_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view department SOP documents" ON public.department_sop_documents;
CREATE POLICY "Authenticated users can view department SOP documents"
  ON public.department_sop_documents FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authorized managers can insert department SOP documents" ON public.department_sop_documents;
CREATE POLICY "Authorized managers can insert department SOP documents"
  ON public.department_sop_documents FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND updated_by = auth.uid()
    AND public.can_manage_department_sops(auth.uid(), department_id)
  );

DROP POLICY IF EXISTS "Authorized managers can update department SOP documents" ON public.department_sop_documents;
CREATE POLICY "Authorized managers can update department SOP documents"
  ON public.department_sop_documents FOR UPDATE
  USING (public.can_manage_department_sops(auth.uid(), department_id))
  WITH CHECK (
    updated_by = auth.uid()
    AND public.can_manage_department_sops(auth.uid(), department_id)
  );

DROP POLICY IF EXISTS "Authorized managers can delete department SOP documents" ON public.department_sop_documents;
CREATE POLICY "Authorized managers can delete department SOP documents"
  ON public.department_sop_documents FOR DELETE
  USING (public.can_manage_department_sops(auth.uid(), department_id));

REVOKE INSERT, UPDATE, DELETE ON TABLE public.department_sop_documents FROM anon;
