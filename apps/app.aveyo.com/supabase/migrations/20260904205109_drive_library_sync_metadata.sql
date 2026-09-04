-- Stable Google Drive identities allow the employee-facing library to be
-- reconciled from Drive without replacing rows on every refresh. The parent
-- reference preserves arbitrary nested folder structure.

ALTER TABLE public.field_safety_folders
  ADD COLUMN drive_item_id TEXT,
  ADD COLUMN parent_folder_id UUID;

ALTER TABLE public.field_safety_documents
  ADD COLUMN drive_item_id TEXT;

UPDATE public.field_safety_folders
SET drive_item_id = substring(drive_url FROM '/folders/([A-Za-z0-9_-]+)')
WHERE drive_item_id IS NULL;

UPDATE public.field_safety_documents
SET drive_item_id = substring(url FROM '/d/([A-Za-z0-9_-]+)')
WHERE drive_item_id IS NULL;

ALTER TABLE public.field_safety_folders
  ADD CONSTRAINT field_safety_folders_drive_item_id_check
    CHECK (drive_item_id IS NULL OR drive_item_id ~ '^[A-Za-z0-9_-]+$'),
  ADD CONSTRAINT field_safety_folders_parent_folder_id_fkey
    FOREIGN KEY (parent_folder_id)
    REFERENCES public.field_safety_folders(id)
    ON DELETE CASCADE,
  ADD CONSTRAINT field_safety_folders_not_own_parent
    CHECK (parent_folder_id IS NULL OR parent_folder_id <> id);

ALTER TABLE public.field_safety_documents
  ADD CONSTRAINT field_safety_documents_drive_item_id_check
    CHECK (drive_item_id IS NULL OR drive_item_id ~ '^[A-Za-z0-9_-]+$');

CREATE UNIQUE INDEX field_safety_folders_drive_item_id_uidx
  ON public.field_safety_folders(drive_item_id);

CREATE INDEX field_safety_folders_parent_sort_order_idx
  ON public.field_safety_folders(parent_folder_id, sort_order, created_at);

CREATE UNIQUE INDEX field_safety_documents_drive_item_id_uidx
  ON public.field_safety_documents(drive_item_id);

COMMENT ON COLUMN public.field_safety_folders.drive_item_id IS
  'Stable Google Drive file ID used to reconcile this folder during refresh.';
COMMENT ON COLUMN public.field_safety_folders.parent_folder_id IS
  'Parent folder in the mirrored Google Drive hierarchy; NULL is the library root.';
COMMENT ON COLUMN public.field_safety_documents.drive_item_id IS
  'Stable Google Drive file ID used to reconcile this document during refresh.';
