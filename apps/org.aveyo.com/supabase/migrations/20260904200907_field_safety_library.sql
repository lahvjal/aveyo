-- In-app Field Safety Protocol library backed by Google Drive document links.
-- All active, onboarded employees may read the library. Only active Operations
-- Managers and admins may maintain its folders and documents.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE public.field_safety_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  drive_url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT field_safety_folders_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT field_safety_folders_sort_order_nonnegative CHECK (sort_order >= 0),
  CONSTRAINT field_safety_folders_drive_url_check CHECK (
    char_length(drive_url) <= 2048
    AND drive_url ~ '^https://drive[.]google[.]com/drive(/u/[0-9]+)?/folders/[A-Za-z0-9_-]+/?([?#].*)?$'
  )
);

CREATE TABLE public.field_safety_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  folder_id UUID REFERENCES public.field_safety_folders(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT field_safety_documents_title_not_blank CHECK (length(trim(title)) > 0),
  CONSTRAINT field_safety_documents_sort_order_nonnegative CHECK (sort_order >= 0),
  CONSTRAINT field_safety_documents_url_check CHECK (
    char_length(url) <= 2048
    AND url ~ '^https://(drive|docs)[.]google[.]com/'
  )
);

CREATE INDEX field_safety_folders_sort_order_idx
  ON public.field_safety_folders(sort_order, created_at);
CREATE INDEX field_safety_folders_updated_by_idx
  ON public.field_safety_folders(updated_by);
CREATE INDEX field_safety_documents_folder_sort_order_idx
  ON public.field_safety_documents(folder_id, sort_order, created_at);
CREATE INDEX field_safety_documents_updated_by_idx
  ON public.field_safety_documents(updated_by);

CREATE OR REPLACE FUNCTION private.can_view_field_safety_library()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles actor
    WHERE actor.id = (SELECT auth.uid())
      AND COALESCE(actor.employment_status, 'active') = 'active'
      AND COALESCE(actor.onboarding_completed, FALSE) = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION private.can_manage_field_safety_library()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
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
  );
$$;

REVOKE ALL ON FUNCTION private.can_view_field_safety_library()
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.can_manage_field_safety_library()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_view_field_safety_library()
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_field_safety_library()
  TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_field_safety_library_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_field_safety_folders_updated_at
  BEFORE UPDATE ON public.field_safety_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_field_safety_library_updated_at();

CREATE TRIGGER trg_field_safety_documents_updated_at
  BEFORE UPDATE ON public.field_safety_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_field_safety_library_updated_at();

REVOKE ALL ON FUNCTION public.touch_field_safety_library_updated_at()
  FROM PUBLIC, anon, authenticated;

ALTER TABLE public.field_safety_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_safety_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active staff can view Field Safety folders"
  ON public.field_safety_folders FOR SELECT
  TO authenticated
  USING ((SELECT private.can_view_field_safety_library()));

CREATE POLICY "Operations leaders can insert Field Safety folders"
  ON public.field_safety_folders FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.can_manage_field_safety_library())
    AND updated_by = (SELECT auth.uid())
  );

CREATE POLICY "Operations leaders can update Field Safety folders"
  ON public.field_safety_folders FOR UPDATE
  TO authenticated
  USING ((SELECT private.can_manage_field_safety_library()))
  WITH CHECK (
    (SELECT private.can_manage_field_safety_library())
    AND updated_by = (SELECT auth.uid())
  );

CREATE POLICY "Operations leaders can delete Field Safety folders"
  ON public.field_safety_folders FOR DELETE
  TO authenticated
  USING ((SELECT private.can_manage_field_safety_library()));

CREATE POLICY "Active staff can view Field Safety documents"
  ON public.field_safety_documents FOR SELECT
  TO authenticated
  USING ((SELECT private.can_view_field_safety_library()));

CREATE POLICY "Operations leaders can insert Field Safety documents"
  ON public.field_safety_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT private.can_manage_field_safety_library())
    AND updated_by = (SELECT auth.uid())
  );

CREATE POLICY "Operations leaders can update Field Safety documents"
  ON public.field_safety_documents FOR UPDATE
  TO authenticated
  USING ((SELECT private.can_manage_field_safety_library()))
  WITH CHECK (
    (SELECT private.can_manage_field_safety_library())
    AND updated_by = (SELECT auth.uid())
  );

CREATE POLICY "Operations leaders can delete Field Safety documents"
  ON public.field_safety_documents FOR DELETE
  TO authenticated
  USING ((SELECT private.can_manage_field_safety_library()));

REVOKE ALL ON TABLE public.field_safety_folders FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.field_safety_documents FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.field_safety_folders
  TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.field_safety_documents
  TO authenticated, service_role;

-- Mirror the current Drive folder layout. Drive remains the source of truth for
-- file contents; these rows provide the employee-facing navigation structure.
INSERT INTO public.field_safety_folders (
  id,
  name,
  drive_url,
  sort_order
)
VALUES (
  'f5a00000-0000-4000-8000-000000000001',
  'Historical Documents',
  'https://drive.google.com/drive/folders/1rxQVcSWJ2moeTBuF3Gu7B37GPvugFiFJ',
  0
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.field_safety_documents (
  id,
  folder_id,
  title,
  description,
  url,
  sort_order
)
VALUES
  (
    'f5a10000-0000-4000-8000-000000000001',
    NULL,
    'Aveyo Electrical Work Safety Program V2.docx',
    'Current editable document',
    'https://docs.google.com/document/d/11uTlSQxm-cTfLho4bd-QaSE30lOuZTp0/edit',
    0
  ),
  (
    'f5a10000-0000-4000-8000-000000000002',
    NULL,
    'Aveyo Electrical Work Safety Program V2.docx.pdf',
    'Current PDF',
    'https://drive.google.com/file/d/1tO8RG-az2usgi4msHngml7K4M7B39A_a/view',
    1
  ),
  (
    'f5a10000-0000-4000-8000-000000000003',
    NULL,
    'Aveyo Fall Protection Safety Program V2 9_3_2026.docx.pdf',
    'Current PDF',
    'https://drive.google.com/file/d/1M6Ib8dWikD2dHgqIwAz9A_n67SleVfRw/view',
    2
  ),
  (
    'f5a10000-0000-4000-8000-000000000004',
    NULL,
    'Aveyo Fall Protection Safety Program V2 9/3/2026.docx',
    'Current editable document',
    'https://docs.google.com/document/d/1QG4n6Uxd0wxO_f_vo24MCVK6K2bOjmXF/edit',
    3
  ),
  (
    'f5a20000-0000-4000-8000-000000000001',
    'f5a00000-0000-4000-8000-000000000001',
    'Aveyo_Electrical_Work_Safety_Program (1).docx',
    'Historical version',
    'https://docs.google.com/document/d/11KgZSoUiT5IajZifQoluKUzpd6poxhHp/edit',
    0
  ),
  (
    'f5a20000-0000-4000-8000-000000000002',
    'f5a00000-0000-4000-8000-000000000001',
    'Aveyo_Fall_Protection_Safety_Program-Original.docx',
    'Historical version',
    'https://docs.google.com/document/d/1IRGUGDQ3xp1MExdfpROcd8Rb10gLA1EP/edit',
    1
  )
ON CONFLICT (id) DO NOTHING;

-- The Operations card now opens the in-app library instead of bypassing it.
UPDATE public.operations_tab_links
SET drive_url = NULL
WHERE tab_key = 'field_safety_protocol'
  AND drive_url IS NOT NULL;

COMMENT ON TABLE public.field_safety_folders IS
  'Folder navigation mirroring the Field Safety Protocol Google Drive hierarchy.';
COMMENT ON TABLE public.field_safety_documents IS
  'Google Drive document links displayed in the Field Safety Protocol library.';
