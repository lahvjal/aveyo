// Shared constants and helpers for the quarterly anonymous employee survey.
// Window logic must stay in sync with the SQL helpers in migration
// 066_employee_survey_enps.sql (current_survey_quarter / is_survey_window_open).

export const SURVEY_WINDOW_DAYS = 30

export type SurveyTenure =
  | '3_plus_years'
  | '2_years'
  | '1_year'
  | '6_months'
  | 'less_than_6_months'

export const TENURE_OPTIONS: { value: SurveyTenure; label: string }[] = [
  { value: '3_plus_years', label: '3+ years' },
  { value: '2_years', label: '2 years' },
  { value: '1_year', label: '1 year' },
  { value: '6_months', label: '6 months' },
  { value: 'less_than_6_months', label: '<6 months' },
]

export const LIKERT_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Strongly Disagree' },
  { value: 2, label: 'Disagree' },
  { value: 3, label: 'Neutral' },
  { value: 4, label: 'Agree' },
  { value: 5, label: 'Strongly Agree' },
]

export const SURVEY_INTRO =
  'A key part of our mission is to become the most trusted solar brand in the world. ' +
  'In order to achieve that, we must ensure that our customers and employees feel completely taken care of. ' +
  'This survey is an ongoing effort to improve our internal processes and culture. ' +
  'Your feedback is crucial to that improvement.'

export const SURVEY_CONFIDENTIALITY_NOTE =
  'Please answer openly and honestly. Your answers will remain confidential — responses are stored anonymously and are never linked to your name.'

export const SURVEY_QUESTIONS = {
  tenure: 'How long have you worked at Aveyo?',
  enps: 'How likely are you to recommend Aveyo as a place to work?',
  toolsFreedom: 'I am given the proper tools and freedom to accomplish my role at Aveyo.',
  livesValues:
    'I believe Aveyo genuinely lives by its stated values (Integrity, Change Maker Mentality, Personal Growth, Succeed Together, Accountability).',
  safeSeen: 'I feel safe, seen, and understood in my role and at Aveyo as a whole.',
  comment:
    'In what ways (if any) could our leadership team improve your overall experience working for Aveyo?',
} as const

/** Minimum responses required before aggregates/comments are shown to admins. */
export const MIN_RESPONSES_FOR_RESULTS = 3

export function getQuarterLabel(date: Date = new Date()): string {
  const quarter = Math.floor(date.getMonth() / 3) + 1
  return `${date.getFullYear()}-Q${quarter}`
}

export function getQuarterStart(date: Date = new Date()): Date {
  const quarterStartMonth = Math.floor(date.getMonth() / 3) * 3
  return new Date(date.getFullYear(), quarterStartMonth, 1)
}

/** The survey opens on day 1 of each calendar quarter and stays open 30 days. */
export function getWindowClose(date: Date = new Date()): Date {
  const close = getQuarterStart(date)
  close.setDate(close.getDate() + SURVEY_WINDOW_DAYS)
  return close
}

export function isSurveyWindowOpen(date: Date = new Date()): boolean {
  return date < getWindowClose(date)
}

/** Start of the next survey window (first day of the next calendar quarter). */
export function getNextWindowOpen(date: Date = new Date()): Date {
  const start = getQuarterStart(date)
  return new Date(start.getFullYear(), start.getMonth() + 3, 1)
}

/** Human-friendly label, e.g. "Q3 2026". */
export function formatQuarterLabel(quarter: string): string {
  const [year, q] = quarter.split('-')
  return `${q} ${year}`
}

export type EnpsBreakdown = {
  promoters: number
  passives: number
  detractors: number
  total: number
  /** −100..100, rounded to nearest integer. Null when total is 0. */
  score: number | null
}

export function computeEnps(scores: number[]): EnpsBreakdown {
  const total = scores.length
  const promoters = scores.filter((s) => s >= 9).length
  const detractors = scores.filter((s) => s <= 6).length
  const passives = total - promoters - detractors
  const score = total === 0 ? null : Math.round(((promoters - detractors) / total) * 100)
  return { promoters, passives, detractors, total, score }
}

/** List of past + current quarters since the feature launched, newest first. */
export function listQuartersSince(firstQuarter: string, now: Date = new Date()): string[] {
  const match = /^(\d{4})-Q([1-4])$/.exec(firstQuarter)
  if (!match) return [getQuarterLabel(now)]

  let year = Number(match[1])
  let q = Number(match[2])
  const currentYear = now.getFullYear()
  const currentQ = Math.floor(now.getMonth() / 3) + 1

  const quarters: string[] = []
  while (year < currentYear || (year === currentYear && q <= currentQ)) {
    quarters.push(`${year}-Q${q}`)
    q += 1
    if (q > 4) {
      q = 1
      year += 1
    }
  }
  return quarters.reverse()
}
