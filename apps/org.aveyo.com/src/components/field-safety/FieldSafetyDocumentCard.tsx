import { useEffect, useState } from 'react'
import {
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Loader2,
  Pencil,
  Presentation,
  Trash2,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Textarea } from '../ui/textarea'
import {
  getFieldSafetyDocumentKind,
  getFieldSafetyDocumentKindLabel,
  getFieldSafetyDocumentUrlError,
  normalizeFieldSafetyUrl,
} from '../../lib/field-safety'
import type {
  FieldSafetyDocument,
  FieldSafetyDocumentDraft,
  FieldSafetyFolder,
} from '../../types/field-safety'

interface FieldSafetyDocumentCardProps {
  document?: FieldSafetyDocument
  folders: FieldSafetyFolder[]
  defaultFolderId?: string | null
  canEdit: boolean
  isSaving?: boolean
  startInEditMode?: boolean
  onSave?: (draft: FieldSafetyDocumentDraft) => Promise<void>
  onDelete?: () => Promise<void>
  onCancelCreate?: () => void
}

function KindIcon({ document }: { document?: FieldSafetyDocument }) {
  const kind = getFieldSafetyDocumentKind(document?.title ?? '', document?.url ?? '')

  switch (kind) {
    case 'spreadsheet':
      return <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
    case 'slides':
      return <Presentation className="h-5 w-5" aria-hidden="true" />
    case 'drive':
      return <FolderOpen className="h-5 w-5" aria-hidden="true" />
    default:
      return <FileText className="h-5 w-5" aria-hidden="true" />
  }
}

export function FieldSafetyDocumentCard({
  document,
  folders,
  defaultFolderId = null,
  canEdit,
  isSaving = false,
  startInEditMode = false,
  onSave,
  onDelete,
  onCancelCreate,
}: FieldSafetyDocumentCardProps) {
  const [isEditing, setIsEditing] = useState(startInEditMode)
  const [draft, setDraft] = useState<FieldSafetyDocumentDraft>({
    title: document?.title ?? '',
    description: document?.description ?? '',
    url: document?.url ?? '',
    folderId: document?.folder_id ?? defaultFolderId,
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEditing) {
      setDraft({
        title: document?.title ?? '',
        description: document?.description ?? '',
        url: document?.url ?? '',
        folderId: document?.folder_id ?? defaultFolderId,
      })
      setError(null)
    }
  }, [document, defaultFolderId, isEditing])

  const handleSave = async () => {
    if (!onSave) return

    const title = draft.title.trim()
    if (!title) {
      setError('Document title is required.')
      return
    }

    const urlError = getFieldSafetyDocumentUrlError(draft.url)
    if (urlError) {
      setError(urlError)
      return
    }

    setError(null)
    try {
      await onSave({
        title,
        description: draft.description.trim(),
        url: normalizeFieldSafetyUrl(draft.url),
        folderId: draft.folderId,
      })
      setIsEditing(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save this document.')
    }
  }

  const handleCancel = () => {
    if (!document) {
      onCancelCreate?.()
      return
    }

    setDraft({
      title: document.title,
      description: document.description,
      url: document.url,
      folderId: document.folder_id,
    })
    setError(null)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <Input
            value={draft.title}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Document title"
            disabled={isSaving}
          />
          <Textarea
            value={draft.description}
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            placeholder="Short description"
            rows={3}
            disabled={isSaving}
          />
          <Input
            value={draft.url}
            onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
            placeholder="https://drive.google.com/..."
            disabled={isSaving}
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Folder</label>
            <Select
              value={draft.folderId ?? ''}
              onChange={(event) => setDraft((current) => ({
                ...current,
                folderId: event.target.value || null,
              }))}
              disabled={isSaving}
            >
              <option value="">Current documents</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </Select>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const kind = getFieldSafetyDocumentKind(document?.title ?? '', document?.url ?? '')

  return (
    <div className="group rounded-lg border bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-md border bg-background p-2 text-primary">
            <KindIcon document={document} />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {getFieldSafetyDocumentKindLabel(kind)}
            </p>
            <h3 className="font-semibold text-sm leading-snug break-words">{document?.title}</h3>
            {document?.description ? (
              <p className="text-sm text-muted-foreground">{document.description}</p>
            ) : null}
          </div>
        </div>

        {canEdit && document ? (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label={`Edit ${document.title}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {onDelete ? (
              <button
                type="button"
                onClick={() => void onDelete()}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                aria-label={`Delete ${document.title}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4">
        <a
          href={document?.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          Open document
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </div>
  )
}
