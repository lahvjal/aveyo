import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import {
  getQuarterLabel,
  isSurveyWindowOpen,
  type SurveyTenure,
} from '../lib/employeeSurvey'

export interface SurveySubmission {
  tenure: SurveyTenure
  enpsScore: number
  toolsFreedom: number
  livesValues: number
  safeSeen: number
  comment?: string
}

export interface SurveyResponseRow {
  id: string
  quarter: string
  tenure: SurveyTenure
  enps_score: number
  tools_freedom: number
  lives_values: number
  safe_seen: number
  comment: string | null
  created_on: string
}

export interface SurveyCompletionRow {
  id: string
  profile_id: string
  quarter: string
  completed_at: string
}

/**
 * Current-quarter survey status for the signed-in employee:
 * whether the window is open and whether they've already submitted.
 */
export function useSurveyStatus() {
  const { user, loading: authLoading } = useAuth()
  const quarter = getQuarterLabel()
  const windowOpen = isSurveyWindowOpen()

  const completionQuery = useQuery({
    queryKey: ['employee-survey', 'my-completion', user?.id, quarter],
    enabled: !authLoading && Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_survey_completions')
        .select('id')
        .eq('profile_id', user!.id)
        .eq('quarter', quarter)
        .maybeSingle()

      if (error) throw error
      return Boolean(data)
    },
  })

  return {
    quarter,
    windowOpen,
    hasCompleted: completionQuery.data ?? false,
    isLoading: authLoading || completionQuery.isLoading,
  }
}

/** Submits the anonymous survey via the submit_employee_survey RPC. */
export function useSubmitSurvey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (submission: SurveySubmission) => {
      const { data, error } = await supabase.rpc('submit_employee_survey', {
        p_tenure: submission.tenure,
        p_enps_score: submission.enpsScore,
        p_tools_freedom: submission.toolsFreedom,
        p_lives_values: submission.livesValues,
        p_safe_seen: submission.safeSeen,
        p_comment: submission.comment?.trim() || null,
      })

      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-survey'] })
    },
  })
}

/** Admin-only (enforced by RLS): anonymous responses for a quarter. */
export function useSurveyResponses(quarter: string, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['employee-survey', 'responses', quarter],
    enabled: enabled && Boolean(quarter),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_survey_responses')
        .select('*')
        .eq('quarter', quarter)
        .order('created_on', { ascending: false })

      if (error) throw error
      return (data ?? []) as SurveyResponseRow[]
    },
  })
}

/** Admin-only (enforced by RLS): completion rows for a quarter. */
export function useSurveyCompletions(quarter: string, { enabled = true } = {}) {
  return useQuery({
    queryKey: ['employee-survey', 'completions', quarter],
    enabled: enabled && Boolean(quarter),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_survey_completions')
        .select('*')
        .eq('quarter', quarter)

      if (error) throw error
      return (data ?? []) as SurveyCompletionRow[]
    },
  })
}

/** Admin-only: earliest quarter with any completion, for the quarter selector. */
export function useEarliestSurveyQuarter({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['employee-survey', 'earliest-quarter'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_survey_completions')
        .select('quarter')
        .order('quarter', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      return data?.quarter ?? null
    },
  })
}
