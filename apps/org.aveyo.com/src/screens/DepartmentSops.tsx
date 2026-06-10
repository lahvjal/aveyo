import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, FolderPlus, Loader2, Plus } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { usePermissions } from '../hooks/usePermissions'
import { getDepartmentAncestorPath, useDepartments } from '../lib/queries'
import { canManageDepartmentSops } from '../lib/sop-permissions'
import { buildSopFolderSections } from '../lib/sop-layout'
import {
  useCreateDepartmentSopDocument,
  useCreateDepartmentSopFolder,
  useDeleteDepartmentSopDocument,
  useDeleteDepartmentSopFolder,
  useDepartmentBySlug,
  useDepartmentSopDocuments,
  useDepartmentSopFolders,
  useUpdateDepartmentSopDocument,
  useUpdateDepartmentSopFolder,
} from '../hooks/useSops'
import { SopDocumentCard } from '../components/sops/SopDocumentCard'
import { SopFolderCard } from '../components/sops/SopFolderCard'
import { Button } from '../components/ui/button'
import type { SopDocumentDraft } from '../types/sops'

interface DepartmentSopsProps {
  slug: string
}

export default function DepartmentSops({ slug }: DepartmentSopsProps) {
  const { user } = useAuth()
  const { data: profile } = useProfile()
  const { isLoading: permissionsLoading } = usePermissions()
  const { data: departments = [] } = useDepartments()
  const { data: department, isLoading: departmentLoading } = useDepartmentBySlug(slug)
  const { data: folders = [], isLoading: foldersLoading } = useDepartmentSopFolders(
    department?.id ?? null
  )
  const { data: documents = [], isLoading: documentsLoading } = useDepartmentSopDocuments(
    department?.id ?? null
  )

  const createFolder = useCreateDepartmentSopFolder()
  const updateFolder = useUpdateDepartmentSopFolder()
  const deleteFolder = useDeleteDepartmentSopFolder()
  const createDocument = useCreateDepartmentSopDocument()
  const updateDocument = useUpdateDepartmentSopDocument()
  const deleteDocument = useDeleteDepartmentSopDocument()

  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [isCreatingDocument, setIsCreatingDocument] = useState(false)
  const [activeMutationId, setActiveMutationId] = useState<string | null>(null)

  const ancestorPath = useMemo(
    () => (department ? getDepartmentAncestorPath(department.id, departments) : []),
    [department, departments]
  )

  const canEdit = useMemo(
    () => canManageDepartmentSops(profile, department?.id ?? '', departments),
    [profile, department?.id, departments]
  )

  const sections = useMemo(
    () => buildSopFolderSections(folders, documents),
    [folders, documents]
  )

  const openFolder = useMemo(
    () => folders.find((folder) => folder.id === openFolderId) ?? null,
    [folders, openFolderId]
  )

  const unfiledSection = useMemo(
    () => sections.find((section) => section.folder === null) ?? { folder: null, documents: [] },
    [sections]
  )

  const openFolderSection = useMemo(
    () =>
      openFolderId
        ? sections.find((section) => section.folder?.id === openFolderId) ?? {
            folder: openFolder,
            documents: [],
          }
        : null,
    [sections, openFolderId, openFolder]
  )

  usePageTitle(
    department
      ? openFolder
        ? `${openFolder.name} · ${department.name} SOPs`
        : `${department.name} SOPs`
      : 'Department SOPs'
  )

  const isLoading =
    departmentLoading || foldersLoading || documentsLoading || permissionsLoading

  const nextDocumentSortOrder =
    documents.reduce((max, document) => Math.max(max, document.sort_order), -1) + 1

  const nextFolderSortOrder =
    folders.reduce((max, folder) => Math.max(max, folder.sort_order), -1) + 1

  const handleCreateFolder = async (name: string) => {
    if (!department || !user?.id) {
      return
    }

    setActiveMutationId('create-folder')
    try {
      await createFolder.mutateAsync({
        departmentId: department.id,
        userId: user.id,
        name,
        sortOrder: nextFolderSortOrder,
      })
      setIsCreatingFolder(false)
    } finally {
      setActiveMutationId(null)
    }
  }

  const handleRenameFolder = async (folderId: string, name: string) => {
    if (!user?.id) {
      return
    }

    setActiveMutationId(`folder-${folderId}`)
    try {
      await updateFolder.mutateAsync({
        id: folderId,
        userId: user.id,
        name,
      })
    } finally {
      setActiveMutationId(null)
    }
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!department) {
      return
    }

    if (!window.confirm('Delete this folder? Documents inside will move to Unfiled.')) {
      return
    }

    setActiveMutationId(`folder-${folderId}`)
    try {
      await deleteFolder.mutateAsync({
        id: folderId,
        departmentId: department.id,
      })
      if (openFolderId === folderId) {
        setOpenFolderId(null)
      }
    } finally {
      setActiveMutationId(null)
    }
  }

  const handleCreateDocument = async (draft: SopDocumentDraft) => {
    if (!department || !user?.id) {
      return
    }

    setActiveMutationId('create-document')
    try {
      await createDocument.mutateAsync({
        departmentId: department.id,
        userId: user.id,
        draft: {
          ...draft,
          folderId: openFolderId ?? draft.folderId,
        },
        sortOrder: nextDocumentSortOrder,
      })
      setIsCreatingDocument(false)
    } finally {
      setActiveMutationId(null)
    }
  }

  const handleUpdateDocument = async (documentId: string, draft: SopDocumentDraft) => {
    if (!user?.id) {
      return
    }

    setActiveMutationId(documentId)
    try {
      await updateDocument.mutateAsync({
        id: documentId,
        userId: user.id,
        draft,
      })
    } finally {
      setActiveMutationId(null)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!department) {
      return
    }

    if (!window.confirm('Delete this document link?')) {
      return
    }

    setActiveMutationId(documentId)
    try {
      await deleteDocument.mutateAsync({
        id: documentId,
        departmentId: department.id,
      })
    } finally {
      setActiveMutationId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[320px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!department) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          href="/sops"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All departments
        </Link>
        <h1 className="text-3xl font-bold mb-2">Department not found</h1>
        <p className="text-muted-foreground">
          This department SOP page does not exist or the link may be outdated.
        </p>
      </div>
    )
  }

  const visibleFolders = folders.filter(
    (folder) => canEdit || (sections.find((section) => section.folder?.id === folder.id)?.documents.length ?? 0) > 0
  )

  const hasRootContent =
    visibleFolders.length > 0 ||
    unfiledSection.documents.length > 0 ||
    isCreatingFolder ||
    isCreatingDocument

  const folderDocuments = openFolderSection?.documents ?? []

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Link
          href="/sops"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All departments
        </Link>

        {openFolder ? (
          <button
            type="button"
            onClick={() => {
              setOpenFolderId(null)
              setIsCreatingDocument(false)
            }}
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to folders
          </button>
        ) : null}

        {ancestorPath.length > 1 ? (
          <p className="text-sm text-muted-foreground mb-2">
            {ancestorPath
              .slice(0, -1)
              .map((node) => node.name)
              .join(' / ')}
          </p>
        ) : null}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: department.color }}
                aria-hidden="true"
              />
              <h1 className="text-3xl font-bold">
                {openFolder ? openFolder.name : department.name}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {openFolder
                ? canEdit
                  ? 'Documents inside this folder.'
                  : 'Documents in this folder.'
                : canEdit
                  ? 'Open a folder or manage unfiled documents for this department’s SOPs.'
                  : 'Folders and documents for this department’s standard operating procedures.'}
            </p>
          </div>

          {canEdit ? (
            openFolder ? (
              <Button onClick={() => setIsCreatingDocument(true)} disabled={isCreatingDocument}>
                <Plus className="mr-2 h-4 w-4" />
                Add document
              </Button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setIsCreatingFolder(true)} disabled={isCreatingFolder}>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Add folder
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreatingDocument(true)}
                  disabled={isCreatingDocument}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add unfiled document
                </Button>
              </div>
            )
          ) : null}
        </div>
      </div>

      {openFolder ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isCreatingDocument ? (
            <SopDocumentCard
              canEdit
              folders={folders}
              defaultFolderId={openFolder.id}
              startInEditMode
              isSaving={activeMutationId === 'create-document'}
              onSave={handleCreateDocument}
              onCancelCreate={() => setIsCreatingDocument(false)}
            />
          ) : null}

          {folderDocuments.map((document) => (
            <SopDocumentCard
              key={document.id}
              document={document}
              folders={folders}
              canEdit={canEdit}
              isSaving={activeMutationId === document.id}
              onSave={(draft) => handleUpdateDocument(document.id, draft)}
              onDelete={() => handleDeleteDocument(document.id)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isCreatingFolder ? (
            <SopFolderCard
              documentCount={0}
              canEdit
              startInEditMode
              isSaving={activeMutationId === 'create-folder'}
              onSaveName={handleCreateFolder}
              onCancelCreate={() => setIsCreatingFolder(false)}
            />
          ) : null}

          {visibleFolders.map((folder) => {
            const folderDocumentsCount =
              sections.find((section) => section.folder?.id === folder.id)?.documents.length ?? 0

            return (
              <SopFolderCard
                key={folder.id}
                folder={folder}
                documentCount={folderDocumentsCount}
                canEdit={canEdit}
                isSaving={activeMutationId === `folder-${folder.id}`}
                onOpen={() => setOpenFolderId(folder.id)}
                onSaveName={(name) => handleRenameFolder(folder.id, name)}
                onDelete={() => handleDeleteFolder(folder.id)}
              />
            )
          })}

          {isCreatingDocument ? (
            <SopDocumentCard
              canEdit
              folders={folders}
              defaultFolderId={null}
              startInEditMode
              isSaving={activeMutationId === 'create-document'}
              onSave={handleCreateDocument}
              onCancelCreate={() => setIsCreatingDocument(false)}
            />
          ) : null}

          {unfiledSection.documents.map((document) => (
            <SopDocumentCard
              key={document.id}
              document={document}
              folders={folders}
              canEdit={canEdit}
              isSaving={activeMutationId === document.id}
              onSave={(draft) => handleUpdateDocument(document.id, draft)}
              onDelete={() => handleDeleteDocument(document.id)}
            />
          ))}
        </div>
      )}

      {openFolder && !isCreatingDocument && folderDocuments.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed px-6 py-12 text-center text-muted-foreground">
          <p className="font-medium text-foreground mb-1">This folder is empty</p>
          <p className="text-sm">
            {canEdit
              ? 'Add your first document to this folder.'
              : 'No documents have been added to this folder yet.'}
          </p>
        </div>
      ) : null}

      {!openFolder && !hasRootContent ? (
        <div className="mt-6 rounded-lg border border-dashed px-6 py-12 text-center text-muted-foreground">
          <p className="font-medium text-foreground mb-1">No SOP content yet</p>
          <p className="text-sm">
            {canEdit
              ? 'Create a folder or add your first document to get started.'
              : 'This department has not published any SOP documents yet.'}
          </p>
        </div>
      ) : null}
    </div>
  )
}
