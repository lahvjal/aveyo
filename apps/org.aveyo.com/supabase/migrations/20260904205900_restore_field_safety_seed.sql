-- Restore the known Field Safety Drive snapshot after introducing a root-access
-- guard for Drive synchronization. This is idempotent for fresh environments.

INSERT INTO public.field_safety_folders (
  id,
  name,
  drive_url,
  drive_item_id,
  parent_folder_id,
  sort_order
)
VALUES (
  'f5a00000-0000-4000-8000-000000000001',
  'Historical Documents',
  'https://drive.google.com/drive/folders/1rxQVcSWJ2moeTBuF3Gu7B37GPvugFiFJ',
  '1rxQVcSWJ2moeTBuF3Gu7B37GPvugFiFJ',
  NULL,
  0
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  drive_url = EXCLUDED.drive_url,
  drive_item_id = EXCLUDED.drive_item_id,
  parent_folder_id = EXCLUDED.parent_folder_id,
  sort_order = EXCLUDED.sort_order;

INSERT INTO public.field_safety_documents (
  id,
  folder_id,
  title,
  description,
  url,
  drive_item_id,
  sort_order
)
VALUES
  (
    'f5a10000-0000-4000-8000-000000000001',
    NULL,
    'Aveyo Electrical Work Safety Program V2.docx',
    'Current editable document',
    'https://docs.google.com/document/d/11uTlSQxm-cTfLho4bd-QaSE30lOuZTp0/edit',
    '11uTlSQxm-cTfLho4bd-QaSE30lOuZTp0',
    0
  ),
  (
    'f5a10000-0000-4000-8000-000000000002',
    NULL,
    'Aveyo Electrical Work Safety Program V2.docx.pdf',
    'Current PDF',
    'https://drive.google.com/file/d/1tO8RG-az2usgi4msHngml7K4M7B39A_a/view',
    '1tO8RG-az2usgi4msHngml7K4M7B39A_a',
    1
  ),
  (
    'f5a10000-0000-4000-8000-000000000003',
    NULL,
    'Aveyo Fall Protection Safety Program V2 9_3_2026.docx.pdf',
    'Current PDF',
    'https://drive.google.com/file/d/1M6Ib8dWikD2dHgqIwAz9A_n67SleVfRw/view',
    '1M6Ib8dWikD2dHgqIwAz9A_n67SleVfRw',
    2
  ),
  (
    'f5a10000-0000-4000-8000-000000000004',
    NULL,
    'Aveyo Fall Protection Safety Program V2 9/3/2026.docx',
    'Current editable document',
    'https://docs.google.com/document/d/1QG4n6Uxd0wxO_f_vo24MCVK6K2bOjmXF/edit',
    '1QG4n6Uxd0wxO_f_vo24MCVK6K2bOjmXF',
    3
  ),
  (
    'f5a20000-0000-4000-8000-000000000001',
    'f5a00000-0000-4000-8000-000000000001',
    'Aveyo_Electrical_Work_Safety_Program (1).docx',
    'Historical version',
    'https://docs.google.com/document/d/11KgZSoUiT5IajZifQoluKUzpd6poxhHp/edit',
    '11KgZSoUiT5IajZifQoluKUzpd6poxhHp',
    0
  ),
  (
    'f5a20000-0000-4000-8000-000000000002',
    'f5a00000-0000-4000-8000-000000000001',
    'Aveyo_Fall_Protection_Safety_Program-Original.docx',
    'Historical version',
    'https://docs.google.com/document/d/1IRGUGDQ3xp1MExdfpROcd8Rb10gLA1EP/edit',
    '1IRGUGDQ3xp1MExdfpROcd8Rb10gLA1EP',
    1
  )
ON CONFLICT (id) DO UPDATE
SET
  folder_id = EXCLUDED.folder_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  url = EXCLUDED.url,
  drive_item_id = EXCLUDED.drive_item_id,
  sort_order = EXCLUDED.sort_order;
