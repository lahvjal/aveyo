export interface FieldSafetyFolder {
  id: string
  name: string
  drive_url: string
  drive_item_id: string | null
  parent_folder_id: string | null
  sort_order: number
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface FieldSafetyDocument {
  id: string
  folder_id: string | null
  drive_item_id: string | null
  title: string
  description: string
  url: string
  sort_order: number
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface FieldSafetyFolderDraft {
  name: string
  driveUrl: string
}

export interface FieldSafetyDocumentDraft {
  title: string
  description: string
  url: string
  folderId: string | null
}
