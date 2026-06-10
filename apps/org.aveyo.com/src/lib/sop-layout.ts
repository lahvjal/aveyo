import type { DepartmentSopDocument, DepartmentSopFolder } from '../types/sops'

export interface SopFolderSection {
  folder: DepartmentSopFolder | null
  documents: DepartmentSopDocument[]
}

export function buildSopFolderSections(
  folders: DepartmentSopFolder[],
  documents: DepartmentSopDocument[]
): SopFolderSection[] {
  const documentsByFolderId = new Map<string | null, DepartmentSopDocument[]>()
  documentsByFolderId.set(null, [])

  for (const folder of folders) {
    documentsByFolderId.set(folder.id, [])
  }

  for (const document of documents) {
    const folderId = document.folder_id ?? null
    if (!documentsByFolderId.has(folderId)) {
      documentsByFolderId.set(folderId, [])
    }
    documentsByFolderId.get(folderId)!.push(document)
  }

  const sections: SopFolderSection[] = folders.map((folder) => ({
    folder,
    documents: documentsByFolderId.get(folder.id) ?? [],
  }))

  sections.push({
    folder: null,
    documents: documentsByFolderId.get(null) ?? [],
  })

  return sections
}
