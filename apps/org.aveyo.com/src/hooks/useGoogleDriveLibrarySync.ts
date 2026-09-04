import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export type GoogleDriveLibrarySource = 'field_safety_protocol'

export interface GoogleDriveLibrarySyncResult {
  success: true
  source: GoogleDriveLibrarySource
  syncedAt: string
  folderCount: number
  documentCount: number
  removedCount: number
}

interface GoogleDriveLibrarySyncError {
  error?: string
  code?: string
}

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: unknown }).context
    if (context instanceof Response) {
      const payload = await context.clone().json().catch(() => null) as GoogleDriveLibrarySyncError | null
      if (payload?.error) return payload.error
    }
  }

  return error instanceof Error ? error.message : 'Google Drive refresh failed.'
}

export function useGoogleDriveLibrarySync() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (source: GoogleDriveLibrarySource) => {
      const { data, error } = await supabase.functions.invoke('sync-google-drive-library', {
        body: { source },
      })

      if (error) throw new Error(await getFunctionErrorMessage(error))
      return data as GoogleDriveLibrarySyncResult
    },
    onSuccess: async (result) => {
      if (result.source === 'field_safety_protocol') {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['field-safety-folders'] }),
          queryClient.invalidateQueries({ queryKey: ['field-safety-documents'] }),
        ])
      }
    },
  })
}
