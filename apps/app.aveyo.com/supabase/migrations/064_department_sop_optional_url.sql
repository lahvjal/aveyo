-- Allow SOP documents to be saved before a Google Drive link is added.

ALTER TABLE public.department_sop_documents
  DROP CONSTRAINT IF EXISTS department_sop_documents_url_not_blank;

ALTER TABLE public.department_sop_documents
  ALTER COLUMN url SET DEFAULT '';
