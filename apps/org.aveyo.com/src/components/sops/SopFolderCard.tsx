import { useEffect, useState } from 'react'
import { Folder, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import type { DepartmentSopFolder } from '../../types/sops'

interface SopFolderCardProps {
  folder?: DepartmentSopFolder
  documentCount: number
  canEdit: boolean
  isSaving?: boolean
  startInEditMode?: boolean
  onOpen?: () => void
  onSaveName: (name: string) => Promise<void>
  onDelete?: () => Promise<void>
  onCancelCreate?: () => void
  onAddDocument?: () => void
}

export function SopFolderCard({
  folder,
  documentCount,
  canEdit,
  isSaving = false,
  startInEditMode = false,
  onOpen,
  onSaveName,
  onDelete,
  onCancelCreate,
  onAddDocument,
}: SopFolderCardProps) {
  const [isEditing, setIsEditing] = useState(startInEditMode)
  const [name, setName] = useState(folder?.name ?? '')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEditing) {
      setName(folder?.name ?? '')
      setError(null)
    }
  }, [folder, isEditing])

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Folder name is required.')
      return
    }

    setError(null)
    await onSaveName(trimmed)
    setIsEditing(false)
  }

  const handleCancel = () => {
    if (!folder) {
      onCancelCreate?.()
      return
    }

    setName(folder.name)
    setError(null)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="rounded-lg border bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Folder name"
            disabled={isSaving}
          />
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

  const documentLabel =
    documentCount === 1 ? '1 document inside' : `${documentCount} documents inside`

  return (
    <div className="group rounded-lg border bg-white p-5 shadow-sm transition-all hover:border-gray-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          className="flex min-w-0 flex-1 items-start gap-3 text-left disabled:cursor-default"
        >
          <div className="rounded-md border bg-background p-2 text-primary">
            <Folder className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Folder
            </p>
            <h3 className="font-semibold text-sm leading-snug">{folder?.name}</h3>
            <p className="text-sm text-muted-foreground">{documentLabel}</p>
          </div>
        </button>

        {canEdit && folder ? (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              title="Rename folder"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {onDelete ? (
              <button
                type="button"
                onClick={() => void onDelete()}
                className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                title="Delete folder"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4">
        {onOpen ? (
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            Open folder
          </button>
        ) : canEdit && onAddDocument ? (
          <button
            type="button"
            onClick={onAddDocument}
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add document
          </button>
        ) : null}
      </div>
    </div>
  )
}
