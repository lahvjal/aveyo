export interface DepartmentSopFolder {
  id: string
  department_id: string
  name: string
  sort_order: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export interface DepartmentSopDocument {
  id: string
  department_id: string
  folder_id: string | null
  title: string
  description: string
  url: string
  sort_order: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

export type SopDocumentDraft = {
  title: string
  description: string
  url: string
  folderId: string | null
}
