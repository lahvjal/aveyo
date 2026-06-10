import { useEffect, useState } from 'react'
import {
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Link2,
  Loader2,
  Pencil,
  Presentation,
  Trash2,
} from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select } from '../ui/select'
import { Textarea } from '../ui/textarea'
import type { DepartmentSopDocument, DepartmentSopFolder, SopDocumentDraft } from '../../types/sops'
import {
  getSopDocumentKind,
  getSopDocumentKindLabel,
  isValidSopUrl,
  normalizeSopUrl,
} from '../../lib/sop-url'

interface SopDocumentCardProps {
  document?: DepartmentSopDocument
  folders?: DepartmentSopFolder[]
  defaultFolderId?: string | null
  canEdit: boolean
  isSaving?: boolean
  startInEditMode?: boolean
  onSave: (draft: SopDocumentDraft) => Promise<void>
  onDelete?: () => Promise<void>
  onCancelCreate?: () => void
}

function KindIcon({ url }: { url: string }) {
  const kind = getSopDocumentKind(url)

  switch (kind) {
    case 'slides':
      return <Presentation className="h-5 w-5" aria-hidden="true" />
    case 'spreadsheet':
      return <FileSpreadsheet className="h-5 w-5" aria-hidden="true" />
    case 'document':
      return <FileText className="h-5 w-5" aria-hidden="true" />
    case 'drive':
      return <Link2 className="h-5 w-5" aria-hidden="true" />
    default:
      return <ExternalLink className="h-5 w-5" aria-hidden="true" />
  }
}

export function SopDocumentCard({
  document,
  folders = [],
  defaultFolderId = null,
  canEdit,
  isSaving = false,
  startInEditMode = false,
  onSave,
  onDelete,
  onCancelCreate,
}: SopDocumentCardProps) {
  const [isEditing, setIsEditing] = useState(startInEditMode)
  const [draft, setDraft] = useState<SopDocumentDraft>({
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
    const title = draft.title.trim()
    const rawUrl = draft.url.trim()
    const url = rawUrl ? normalizeSopUrl(rawUrl) : ''

    if (!title) {
      setError('Title is required.')
      return
    }

    if (!isValidSopUrl(rawUrl)) {
      setError('Enter a valid link (for example, a Google Drive URL).')
      return
    }

    setError(null)
    await onSave({
      title,
      description: draft.description.trim(),
      url,
      folderId: draft.folderId,
    })
    setIsEditing(false)
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
            onChange={(event) =>
              setDraft((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Short description"
            rows={3}
            disabled={isSaving}
          />
          <Input
            value={draft.url}
            onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
            placeholder="https://docs.google.com/... (optional)"
            disabled={isSaving}
          />
          {folders.length > 0 ? (
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Folder</label>
              <Select
                value={draft.folderId ?? ''}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    folderId: event.target.value ? event.target.value : null,
                  }))
                }
                disabled={isSaving}
              >
                <option value="">Unfiled</option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
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

  const documentUrl = document?.url ?? ''
  const kindLabel = getSopDocumentKindLabel(getSopDocumentKind(documentUrl), documentUrl)

  return (
    <div className="group rounded-lg border bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-md border bg-background p-2 text-primary">
            <KindIcon url={document?.url ?? ''} />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {kindLabel}
            </p>
            <h3 className="font-semibold text-sm leading-snug">{document?.title}</h3>
            {document?.description ? (
              <p className="text-sm text-muted-foreground">{document.description}</p>
            ) : null}
          </div>
        </div>

        {canEdit ? (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              title="Edit document"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {onDelete ? (
              <button
                type="button"
                onClick={() => void onDelete()}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                title="Delete document"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4">
        {documentUrl.trim() ? (
          <a
            href={documentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Open document
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        ) : (
          <p className="text-sm text-muted-foreground">Link not added yet</p>
        )}
      </div>
    </div>
  )
}
