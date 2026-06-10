import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Department } from '../types'
import type { DepartmentSopDocument, DepartmentSopFolder, SopDocumentDraft } from '../types/sops'

function invalidateSopQueries(queryClient: ReturnType<typeof useQueryClient>, departmentId?: string) {
  queryClient.invalidateQueries({ queryKey: ['department-sop-documents'] })
  queryClient.invalidateQueries({ queryKey: ['department-sop-folders'] })
  queryClient.invalidateQueries({ queryKey: ['department-sop-document-counts'] })
  if (departmentId) {
    queryClient.invalidateQueries({ queryKey: ['department-sop-documents', departmentId] })
    queryClient.invalidateQueries({ queryKey: ['department-sop-folders', departmentId] })
  }
}

export function useDepartmentBySlug(slug: string) {
  return useQuery({
    queryKey: ['department-by-slug', slug],
    enabled: Boolean(slug),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      if (error) throw error
      return data as Department | null
    },
  })
}

export function useDepartmentSopFolders(departmentId: string | null) {
  return useQuery({
    queryKey: ['department-sop-folders', departmentId],
    enabled: Boolean(departmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_sop_folders')
        .select('*')
        .eq('department_id', departmentId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as DepartmentSopFolder[]
    },
  })
}

export function useDepartmentSopDocuments(departmentId: string | null) {
  return useQuery({
    queryKey: ['department-sop-documents', departmentId],
    enabled: Boolean(departmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_sop_documents')
        .select('*')
        .eq('department_id', departmentId!)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data ?? []) as DepartmentSopDocument[]
    },
  })
}

export function useDepartmentSopDocumentCounts() {
  return useQuery({
    queryKey: ['department-sop-document-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('department_sop_documents')
        .select('department_id')

      if (error) throw error

      const counts = new Map<string, number>()
      for (const row of data ?? []) {
        const departmentId = row.department_id as string
        counts.set(departmentId, (counts.get(departmentId) ?? 0) + 1)
      }

      return counts
    },
  })
}

export function useCreateDepartmentSopFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      departmentId,
      userId,
      name,
      sortOrder,
    }: {
      departmentId: string
      userId: string
      name: string
      sortOrder: number
    }) => {
      const { data, error } = await supabase
        .from('department_sop_folders')
        .insert({
          department_id: departmentId,
          name: name.trim(),
          sort_order: sortOrder,
          created_by: userId,
          updated_by: userId,
        })
        .select()
        .single()

      if (error) throw error
      return data as DepartmentSopFolder
    },
    onSuccess: (data) => {
      invalidateSopQueries(queryClient, data.department_id)
    },
  })
}

export function useUpdateDepartmentSopFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      userId,
      name,
    }: {
      id: string
      userId: string
      name: string
    }) => {
      const { data, error } = await supabase
        .from('department_sop_folders')
        .update({
          name: name.trim(),
          updated_by: userId,
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as DepartmentSopFolder
    },
    onSuccess: (data) => {
      invalidateSopQueries(queryClient, data.department_id)
    },
  })
}

export function useDeleteDepartmentSopFolder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, departmentId }: { id: string; departmentId: string }) => {
      const { error } = await supabase.from('department_sop_folders').delete().eq('id', id)
      if (error) throw error
      return departmentId
    },
    onSuccess: (departmentId) => {
      invalidateSopQueries(queryClient, departmentId)
    },
  })
}

export function useCreateDepartmentSopDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      departmentId,
      userId,
      draft,
      sortOrder,
    }: {
      departmentId: string
      userId: string
      draft: SopDocumentDraft
      sortOrder: number
    }) => {
      const { data, error } = await supabase
        .from('department_sop_documents')
        .insert({
          department_id: departmentId,
          folder_id: draft.folderId,
          title: draft.title.trim(),
          description: draft.description.trim(),
          url: draft.url.trim(),
          sort_order: sortOrder,
          created_by: userId,
          updated_by: userId,
        })
        .select()
        .single()

      if (error) throw error
      return data as DepartmentSopDocument
    },
    onSuccess: (data) => {
      invalidateSopQueries(queryClient, data.department_id)
    },
  })
}

export function useUpdateDepartmentSopDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      userId,
      draft,
    }: {
      id: string
      userId: string
      draft: SopDocumentDraft
    }) => {
      const { data, error } = await supabase
        .from('department_sop_documents')
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
      return data as DepartmentSopDocument
    },
    onSuccess: (data) => {
      invalidateSopQueries(queryClient, data.department_id)
    },
  })
}

export function useDeleteDepartmentSopDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, departmentId }: { id: string; departmentId: string }) => {
      const { error } = await supabase
        .from('department_sop_documents')
        .delete()
        .eq('id', id)

      if (error) throw error
      return departmentId
    },
    onSuccess: (departmentId) => {
      invalidateSopQueries(queryClient, departmentId)
    },
  })
}
