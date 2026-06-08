import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { usePermissions } from '../hooks/usePermissions'
import { getDepartmentAncestorPath, useDepartments } from '../lib/queries'
import { canManageDepartmentSops } from '../lib/sop-permissions'
import {
  useCreateDepartmentSopDocument,
  useDeleteDepartmentSopDocument,
  useDepartmentBySlug,
  useDepartmentSopDocuments,
  useUpdateDepartmentSopDocument,
} from '../hooks/useSops'
import { SopDocumentCard } from '../components/sops/SopDocumentCard'
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
  const { data: documents = [], isLoading: documentsLoading } = useDepartmentSopDocuments(
    department?.id ?? null
  )

  const createDocument = useCreateDepartmentSopDocument()
  const updateDocument = useUpdateDepartmentSopDocument()
  const deleteDocument = useDeleteDepartmentSopDocument()

  const [isCreating, setIsCreating] = useState(false)
  const [activeMutationId, setActiveMutationId] = useState<string | null>(null)

  const ancestorPath = useMemo(
    () => (department ? getDepartmentAncestorPath(department.id, departments) : []),
    [department, departments]
  )

  const canEdit = useMemo(
    () => canManageDepartmentSops(profile, department?.id ?? '', departments),
    [profile, department?.id, departments]
  )

  usePageTitle(department ? `${department.name} SOPs` : 'Department SOPs')

  const isLoading = departmentLoading || documentsLoading || permissionsLoading
  const nextSortOrder =
    documents.reduce((max, document) => Math.max(max, document.sort_order), -1) + 1

  const handleCreate = async (draft: SopDocumentDraft) => {
    if (!department || !user?.id) {
      return
    }

    setActiveMutationId('create')
    try {
      await createDocument.mutateAsync({
        departmentId: department.id,
        userId: user.id,
        draft,
        sortOrder: nextSortOrder,
      })
      setIsCreating(false)
    } finally {
      setActiveMutationId(null)
    }
  }

  const handleUpdate = async (documentId: string, draft: SopDocumentDraft) => {
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

  const handleDelete = async (documentId: string) => {
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
              <h1 className="text-3xl font-bold">{department.name}</h1>
            </div>
            <p className="text-muted-foreground">
              {canEdit
                ? 'Manage Google Drive links for this department’s standard operating procedures.'
                : 'Google Drive links for this department’s standard operating procedures.'}
            </p>
          </div>

          {canEdit ? (
            <Button onClick={() => setIsCreating(true)} disabled={isCreating}>
              <Plus className="mr-2 h-4 w-4" />
              Add document
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isCreating ? (
          <SopDocumentCard
            canEdit
            startInEditMode
            isSaving={activeMutationId === 'create'}
            onSave={handleCreate}
            onCancelCreate={() => setIsCreating(false)}
          />
        ) : null}

        {documents.map((document) => (
          <SopDocumentCard
            key={document.id}
            document={document}
            canEdit={canEdit}
            isSaving={activeMutationId === document.id}
            onSave={(draft) => handleUpdate(document.id, draft)}
            onDelete={() => handleDelete(document.id)}
          />
        ))}
      </div>

      {!isCreating && documents.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed px-6 py-12 text-center text-muted-foreground">
          <p className="font-medium text-foreground mb-1">No documents yet</p>
          <p className="text-sm">
            {canEdit
              ? 'Add your first Google Drive link to get this department SOP page started.'
              : 'This department has not published any SOP documents yet.'}
          </p>
        </div>
      ) : null}
    </div>
  )
}
