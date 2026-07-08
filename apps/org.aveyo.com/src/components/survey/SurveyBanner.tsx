'use client'

import Link from 'next/link'
import { useSurveyStatus } from '../../hooks/useEmployeeSurvey'
import { formatQuarterLabel, getWindowClose } from '../../lib/employeeSurvey'
import { ClipboardList } from 'lucide-react'

/**
 * Prompt shown while the quarterly survey window is open and the signed-in
 * employee hasn't submitted yet.
 */
export function SurveyBanner() {
  const { quarter, windowOpen, hasCompleted, isLoading } = useSurveyStatus()

  if (isLoading || !windowOpen || hasCompleted) {
    return null
  }

  const closeDate = getWindowClose().toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 border-b bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm">
          <span className="font-medium">The {formatQuarterLabel(quarter)} employee survey is open.</span>{' '}
          <span className="text-muted-foreground">
            Six anonymous questions, about two minutes. Open through {closeDate}.
          </span>
        </p>
      </div>
      <Link
        href="/survey"
        className="inline-flex h-9 w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Take the Survey
      </Link>
    </div>
  )
}
