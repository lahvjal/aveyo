import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type {
  FieldSafetyDocument,
  FieldSafetyDocumentDraft,
  FieldSafetyFolder,
  FieldSafetyFolderDraft,
} from '../types/field-safety'

const FOLDERS_QUERY_KEY = ['field-safety-folders'] as const
const DOCUMENTS_QUERY_KEY = ['field-safety-documents'] as const

function invalidateFieldSafetyLibrary(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: FOLDERS_QUERY_KEY })
  queryClient.invalidateQueries({ queryKey: DOCUMENTS_QUERY_KEY })
}

export function useFieldSafetyFolders() {
  return useQuery({
    queryKey: FOLDERS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_safety_folders')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as FieldSafetyFolder[]
    },
  })
}

export function useFieldSafetyDocuments() {
  return useQuery({
    queryKey: DOCUMENTS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('field_safety_documents')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as FieldSafetyDocument[]
    },
  })
}

export function useCreateFieldSafetyFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      draft,
      sortOrder,
      userId,
    }: {
      draft: FieldSafetyFolderDraft
      sortOrder: number
      userId: string
    }) => {
      const { data, error } = await supabase
        .from('field_safety_folders')
        .insert({
          name: draft.name.trim(),
          drive_url: draft.driveUrl.trim(),
          sort_order: sortOrder,
          updated_by: userId,
        })
        .select()
        .single()

      if (error) throw error
      return data as FieldSafetyFolder
    },
    onSuccess: () => invalidateFieldSafetyLibrary(queryClient),
  })
}

export function useUpdateFieldSafetyFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      draft,
      userId,
    }: {
      id: string
      draft: FieldSafetyFolderDraft
      userId: string
    }) => {
      const { data, error } = await supabase
        .from('field_safety_folders')
        .update({
          name: draft.name.trim(),
          drive_url: draft.driveUrl.trim(),
          updated_by: userId,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as FieldSafetyFolder
    },
    onSuccess: () => invalidateFieldSafetyLibrary(queryClient),
  })
}

export function useDeleteFieldSafetyFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('field_safety_folders').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => invalidateFieldSafetyLibrary(queryClient),
  })
}

export function useCreateFieldSafetyDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      draft,
      sortOrder,
      userId,
    }: {
      draft: FieldSafetyDocumentDraft
      sortOrder: number
      userId: string
    }) => {
      const { data, error } = await supabase
        .from('field_safety_documents')
        .insert({
          folder_id: draft.folderId,
          title: draft.title.trim(),
          description: draft.description.trim(),
          url: draft.url.trim(),
          sort_order: sortOrder,
          updated_by: userId,
        })
        .select()
        .single()

      if (error) throw error
      return data as FieldSafetyDocument
    },
    onSuccess: () => invalidateFieldSafetyLibrary(queryClient),
  })
}

export function useUpdateFieldSafetyDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      draft,
      userId,
    }: {
      id: string
      draft: FieldSafetyDocumentDraft
      userId: string
    }) => {
      const { data, error } = await supabase
        .from('field_safety_documents')
        .update({
          folder_id: draft.folderId,
          title: draft.title.trim(),
          description: draft.description.trim(),
          url: draft.url.trim(),
          updated_by: userId,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as FieldSafetyDocument
    },
    onSuccess: () => invalidateFieldSafetyLibrary(queryClient),
  })
}

export function useDeleteFieldSafetyDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('field_safety_documents').delete().eq('id', id)
      if (error) throw error
      return id
    },
    onSuccess: () => invalidateFieldSafetyLibrary(queryClient),
  })
}
