-- Group department SOP documents into named folders.

CREATE TABLE IF NOT EXISTS public.department_sop_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT department_sop_folders_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_department_sop_folders_department_id
  ON public.department_sop_folders (department_id);

CREATE INDEX IF NOT EXISTS idx_department_sop_folders_sort_order
  ON public.department_sop_folders (department_id, sort_order, created_at);

ALTER TABLE public.department_sop_documents
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.department_sop_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_department_sop_documents_folder_id
  ON public.department_sop_documents (folder_id);

CREATE OR REPLACE FUNCTION public.touch_department_sop_folder_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_department_sop_folders_updated_at ON public.department_sop_folders;
CREATE TRIGGER trg_department_sop_folders_updated_at
  BEFORE UPDATE ON public.department_sop_folders
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_department_sop_folder_updated_at();

ALTER TABLE public.department_sop_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view department SOP folders" ON public.department_sop_folders;
CREATE POLICY "Authenticated users can view department SOP folders"
  ON public.department_sop_folders FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authorized managers can insert department SOP folders" ON public.department_sop_folders;
CREATE POLICY "Authorized managers can insert department SOP folders"
  ON public.department_sop_folders FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND updated_by = auth.uid()
    AND public.can_manage_department_sops(auth.uid(), department_id)
  );

DROP POLICY IF EXISTS "Authorized managers can update department SOP folders" ON public.department_sop_folders;
CREATE POLICY "Authorized managers can update department SOP folders"
  ON public.department_sop_folders FOR UPDATE
  USING (public.can_manage_department_sops(auth.uid(), department_id))
  WITH CHECK (
    updated_by = auth.uid()
    AND public.can_manage_department_sops(auth.uid(), department_id)
  );

DROP POLICY IF EXISTS "Authorized managers can delete department SOP folders" ON public.department_sop_folders;
CREATE POLICY "Authorized managers can delete department SOP folders"
  ON public.department_sop_folders FOR DELETE
  USING (public.can_manage_department_sops(auth.uid(), department_id));

REVOKE INSERT, UPDATE, DELETE ON TABLE public.department_sop_folders FROM anon;

DROP POLICY IF EXISTS "Authorized managers can insert department SOP documents" ON public.department_sop_documents;
CREATE POLICY "Authorized managers can insert department SOP documents"
  ON public.department_sop_documents FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND created_by = auth.uid()
    AND updated_by = auth.uid()
    AND public.can_manage_department_sops(auth.uid(), department_id)
    AND (
      folder_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.department_sop_folders folder
        WHERE folder.id = folder_id
          AND folder.department_id = department_sop_documents.department_id
      )
    )
  );

DROP POLICY IF EXISTS "Authorized managers can update department SOP documents" ON public.department_sop_documents;
CREATE POLICY "Authorized managers can update department SOP documents"
  ON public.department_sop_documents FOR UPDATE
  USING (public.can_manage_department_sops(auth.uid(), department_id))
  WITH CHECK (
    updated_by = auth.uid()
    AND public.can_manage_department_sops(auth.uid(), department_id)
    AND (
      folder_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.department_sop_folders folder
        WHERE folder.id = folder_id
          AND folder.department_id = department_sop_documents.department_id
      )
    )
  );
