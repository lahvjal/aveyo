import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  normalizeOperationDriveFolderUrl,
  type OperationTabKey,
  type OperationTabLink,
} from '../lib/operations-config'

const OPERATIONS_TAB_LINKS_QUERY_KEY = ['operations-tab-links'] as const

export function useOperationsTabLinks({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: OPERATIONS_TAB_LINKS_QUERY_KEY,
    enabled,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operations_tab_links')
        .select('*')
        .order('tab_key')

      if (error) throw error
      return (data ?? []) as OperationTabLink[]
    },
  })
}

export function useSetOperationsTabLink() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      tabKey,
      driveUrl,
    }: {
      tabKey: OperationTabKey
      driveUrl: string
    }) => {
      const normalizedUrl = normalizeOperationDriveFolderUrl(driveUrl)
      const { data, error } = await supabase.rpc('set_operations_tab_link', {
        p_tab_key: tabKey,
        p_drive_url: normalizedUrl,
      })

      if (error) throw error
      return data as OperationTabLink
    },
    onSuccess: (updatedLink) => {
      queryClient.setQueryData<OperationTabLink[]>(
        OPERATIONS_TAB_LINKS_QUERY_KEY,
        (current = []) => [
          ...current.filter((link) => link.tab_key !== updatedLink.tab_key),
          updatedLink,
        ],
      )
    },
  })
}
