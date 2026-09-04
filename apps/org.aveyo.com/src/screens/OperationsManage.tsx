import Link from 'next/link'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  Link2,
  Loader2,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePermissions } from '../hooks/usePermissions'
import {
  useOperationsTabLinks,
  useSetOperationsTabLink,
} from '../hooks/useOperationsTabLinks'
import {
  getOperationDriveFolderUrlError,
  normalizeOperationDriveFolderUrl,
  OPERATION_TAB_DEFINITIONS,
  type OperationTabDefinition,
  type OperationTabKey,
  type OperationTabLink,
} from '../lib/operations-config'
import { Navigate } from '../lib/router-shim'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

function getMutationErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const code = 'code' in error ? String(error.code) : ''
    const message = 'message' in error ? String(error.message) : ''

    if (code === '42501') {
      return 'You do not have permission to update Operations links.'
    }
    if (message) {
      return message
    }
  }

  return 'The link could not be saved. Please try again.'
}

interface OperationTabLinkEditorProps {
  definition: OperationTabDefinition
  link: OperationTabLink | undefined
  isSaving: boolean
  showSavingIndicator: boolean
  onSave: (tabKey: OperationTabKey, driveUrl: string) => Promise<OperationTabLink>
}

function OperationTabLinkEditor({
  definition,
  link,
  isSaving,
  showSavingIndicator,
  onSave,
}: OperationTabLinkEditorProps) {
  const [value, setValue] = useState(link?.drive_url ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setValue(link?.drive_url ?? '')
  }, [link?.drive_url])

  const persistValue = async (nextValue: string) => {
    const validationError = getOperationDriveFolderUrlError(nextValue)
    if (validationError) {
      setError(validationError)
      setSaved(false)
      return
    }

    setError(null)
    setSaved(false)
    try {
      const updated = await onSave(definition.key, nextValue)
      setValue(updated.drive_url ?? '')
      setSaved(true)
    } catch (saveError) {
      setError(getMutationErrorMessage(saveError))
    }
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    void persistValue(value)
  }

  const handleRestoreFallback = () => {
    setValue('')
    void persistValue('')
  }

  const normalizedPreview = (() => {
    try {
      return normalizeOperationDriveFolderUrl(value)
    } catch {
      return null
    }
  })()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{definition.title}</CardTitle>
        <CardDescription>{definition.fallbackDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`operations-link-${definition.key}`}>Google Drive folder URL</Label>
            <Input
              id={`operations-link-${definition.key}`}
              type="url"
              inputMode="url"
              value={value}
              onChange={(event) => {
                setValue(event.target.value)
                setError(null)
                setSaved(false)
              }}
              placeholder="https://drive.google.com/drive/folders/..."
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={2048}
              disabled={isSaving}
              aria-describedby={`operations-link-help-${definition.key}`}
              aria-invalid={Boolean(error)}
            />
            <p
              id={`operations-link-help-${definition.key}`}
              className="text-xs text-muted-foreground"
            >
              Leave blank to keep the existing in-app destination.
            </p>
          </div>

          {error ? (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <p>{error}</p>
            </div>
          ) : null}
          {saved ? (
            <p className="text-sm font-medium text-green-700" role="status">
              Link saved.
            </p>
          ) : null}

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              {link?.updated_by ? (
                <span>Last updated {format(new Date(link.updated_at), 'MMM d, yyyy, h:mm a')}</span>
              ) : (
                <span>Using the existing in-app destination</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {normalizedPreview ? (
                <a
                  href={normalizedPreview}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center justify-center rounded-md px-3 text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Preview
                  <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                </a>
              ) : null}
              {link?.drive_url ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRestoreFallback}
                  disabled={isSaving}
                >
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
                  Use default
                </Button>
              ) : null}
              <Button type="submit" size="sm" disabled={isSaving}>
                {showSavingIndicator ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Save link
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export default function OperationsManage() {
  usePageTitle('Manage Operations Links')

  const { canManageOperationsTabs, isLoading: permissionsLoading } = usePermissions()
  const { data: links = [], isLoading: linksLoading, error: linksError } = useOperationsTabLinks({
    enabled: !permissionsLoading && canManageOperationsTabs,
  })
  const setLink = useSetOperationsTabLink()
  const [savingKey, setSavingKey] = useState<OperationTabKey | null>(null)

  if (permissionsLoading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!canManageOperationsTabs) {
    return <Navigate to="/operations" replace />
  }

  const handleSave = async (tabKey: OperationTabKey, driveUrl: string) => {
    setSavingKey(tabKey)
    try {
      return await setLink.mutateAsync({ tabKey, driveUrl })
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <Link
          href="/operations"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Operations
        </Link>
        <h1 className="text-3xl font-bold mb-2">Manage Operations links</h1>
        <p className="text-muted-foreground">
          Choose the shared Google Drive folders opened by Processes and SOPs.
        </p>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-lg border bg-primary/5 p-4 text-sm">
        <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="font-medium">Protected Operations setting</p>
          <p className="mt-1 text-muted-foreground">
            Only active Operations Managers and admins can view or save these destinations.
            Google Drive continues to control who can open each folder.
          </p>
        </div>
      </div>

      {linksLoading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : linksError ? (
        <Card>
          <CardContent className="flex items-start gap-3 p-6">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" aria-hidden="true" />
            <div>
              <p className="font-medium">Operations link settings are unavailable</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The database setup for this feature must be completed before links can be managed.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {OPERATION_TAB_DEFINITIONS.filter((definition) => definition.allowDriveOverride).map((definition) => (
            <OperationTabLinkEditor
              key={definition.key}
              definition={definition}
              link={links.find((link) => link.tab_key === definition.key)}
              isSaving={setLink.isPending}
              showSavingIndicator={savingKey === definition.key}
              onSave={handleSave}
            />
          ))}
        </div>
      )}
    </div>
  )
}
