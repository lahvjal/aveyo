export interface DepartmentSopDocument {
  id: string
  department_id: string
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
}
