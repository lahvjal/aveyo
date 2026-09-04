import Link from 'next/link'
import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { FieldSafetyDocumentCard } from '../components/field-safety/FieldSafetyDocumentCard'
import { FieldSafetyFolderCard } from '../components/field-safety/FieldSafetyFolderCard'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import {
  useFieldSafetyDocuments,
  useFieldSafetyFolders,
} from '../hooks/useFieldSafetyLibrary'
import {
  useGoogleDriveLibrarySync,
  type GoogleDriveLibrarySyncResult,
} from '../hooks/useGoogleDriveLibrarySync'
import { usePageTitle } from '../hooks/usePageTitle'
import { usePermissions } from '../hooks/usePermissions'
import { FIELD_SAFETY_ROOT_DRIVE_URL } from '../lib/field-safety'

export default function FieldSafetyProtocol() {
  const { canManageOperationsTabs, isLoading: permissionsLoading } = usePermissions()
  const {
    data: folders = [],
    isLoading: foldersLoading,
    error: foldersError,
  } = useFieldSafetyFolders()
  const {
    data: documents = [],
    isLoading: documentsLoading,
    error: documentsError,
  } = useFieldSafetyDocuments()
  const syncDriveLibrary = useGoogleDriveLibrarySync()

  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<GoogleDriveLibrarySyncResult | null>(null)

  const openFolder = useMemo(
    () => folders.find((folder) => folder.id === openFolderId) ?? null,
    [folders, openFolderId],
  )
  const parentFolderId = openFolder?.parent_folder_id ?? null
  const visibleFolders = useMemo(
    () => folders.filter((folder) => folder.parent_folder_id === openFolderId),
    [folders, openFolderId],
  )
  const visibleDocuments = useMemo(
    () => documents.filter((document) => document.folder_id === openFolderId),
    [documents, openFolderId],
  )
  const documentCountByFolderId = useMemo(() => {
    const childFolders = new Map<string, string[]>()
    for (const folder of folders) {
      if (!folder.parent_folder_id) continue
      const children = childFolders.get(folder.parent_folder_id) ?? []
      children.push(folder.id)
      childFolders.set(folder.parent_folder_id, children)
    }

    const directCounts = new Map<string, number>()
    for (const document of documents) {
      if (!document.folder_id) continue
      directCounts.set(document.folder_id, (directCounts.get(document.folder_id) ?? 0) + 1)
    }

    const counts = new Map<string, number>()
    const countDocuments = (folderId: string, visiting = new Set<string>()): number => {
      if (counts.has(folderId)) return counts.get(folderId) ?? 0
      if (visiting.has(folderId)) return directCounts.get(folderId) ?? 0
      visiting.add(folderId)
      const count = (directCounts.get(folderId) ?? 0)
        + (childFolders.get(folderId) ?? []).reduce(
          (total, childId) => total + countDocuments(childId, visiting),
          0,
        )
      visiting.delete(folderId)
      counts.set(folderId, count)
      return count
    }

    for (const folder of folders) countDocuments(folder.id)
    return counts
  }, [documents, folders])

  usePageTitle(openFolder ? `${openFolder.name} · Field Safety Protocol` : 'Field Safety Protocol')

  const isLoading = permissionsLoading || foldersLoading || documentsLoading
  const loadError = foldersError ?? documentsError
  const syncError = syncDriveLibrary.error instanceof Error ? syncDriveLibrary.error.message : null

  const handleRefresh = async () => {
    setLastSync(null)
    const result = await syncDriveLibrary.mutateAsync('field_safety_protocol').catch(() => null)
    if (result) setLastSync(result)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        {openFolder ? (
          <button
            type="button"
            onClick={() => setOpenFolderId(parentFolderId)}
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {parentFolderId
              ? folders.find((folder) => folder.id === parentFolderId)?.name ?? 'Parent folder'
              : 'Field Safety Protocol'}
          </button>
        ) : (
          <Link
            href="/operations"
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Operations
          </Link>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold">{openFolder?.name ?? 'Field Safety Protocol'}</h1>
              <Badge variant="outline">Google Drive source</Badge>
            </div>
            <p className="max-w-2xl text-muted-foreground">
              {openFolder
                ? 'Folders and documents mirrored from the Field Safety Shared Drive.'
                : 'Current safety policies, programs, and controlled resources for work in the field.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href={openFolder?.drive_url ?? FIELD_SAFETY_ROOT_DRIVE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              View in Drive
              <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
            </a>
            {canManageOperationsTabs ? (
              <Button
                onClick={() => void handleRefresh()}
                disabled={syncDriveLibrary.isPending}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${syncDriveLibrary.isPending ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                {syncDriveLibrary.isPending ? 'Refreshing…' : 'Refresh from Drive'}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {lastSync ? (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm">
            Drive refreshed: {lastSync.folderCount} {lastSync.folderCount === 1 ? 'folder' : 'folders'} and{' '}
            {lastSync.documentCount} {lastSync.documentCount === 1 ? 'document' : 'documents'}.
          </p>
        </div>
      ) : null}

      {syncError ? (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium">Drive refresh could not finish</p>
            <p className="mt-1">{syncError}</p>
          </div>
        </div>
      ) : null}

      {loadError ? (
        <Card>
          <CardContent className="flex items-start gap-3 p-6">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" aria-hidden="true" />
            <div>
              <p className="font-medium">Field Safety resources are unavailable</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The library could not be loaded. Please try again or contact an administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleFolders.map((folder) => (
            <FieldSafetyFolderCard
              key={folder.id}
              folder={folder}
              documentCount={documentCountByFolderId.get(folder.id) ?? 0}
              canEdit={false}
              onOpen={() => setOpenFolderId(folder.id)}
            />
          ))}

          {visibleDocuments.map((document) => (
            <FieldSafetyDocumentCard
              key={document.id}
              document={document}
              folders={folders}
              canEdit={false}
            />
          ))}
        </div>
      )}

      {!loadError && visibleFolders.length === 0 && visibleDocuments.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed px-6 py-12 text-center text-muted-foreground">
          <p className="mb-1 font-medium text-foreground">
            {openFolder ? 'This folder is empty' : 'No Field Safety resources yet'}
          </p>
          <p className="text-sm">
            {canManageOperationsTabs
              ? 'Add the resource in Google Drive, then refresh this library.'
              : 'No documents have been published here yet.'}
          </p>
        </div>
      ) : null}
    </div>
  )
}
