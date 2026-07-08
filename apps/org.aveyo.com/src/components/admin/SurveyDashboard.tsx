import { useMemo, useState } from 'react'
import { useProfiles } from '../../hooks/useProfile'
import {
  useSurveyResponses,
  useSurveyCompletions,
  useEarliestSurveyQuarter,
} from '../../hooks/useEmployeeSurvey'
import {
  computeEnps,
  formatQuarterLabel,
  getQuarterLabel,
  isSurveyWindowOpen,
  listQuartersSince,
  LIKERT_OPTIONS,
  TENURE_OPTIONS,
  SURVEY_QUESTIONS,
  MIN_RESPONSES_FOR_RESULTS,
} from '../../lib/employeeSurvey'
import {
  sendSurveyLaunchEmail,
  sendSurveyReminderEmail,
  sendSurveyTestEmail,
} from '../../lib/notifications'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Select } from '../ui/select'
import { Input } from '../ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar'
import { getInitials } from '../../lib/utils'
import {
  CheckCircle2,
  Clock,
  FlaskConical,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  ShieldQuestion,
  TrendingUp,
} from 'lucide-react'

function DistributionBar({
  label,
  count,
  total,
  colorClass = 'bg-primary',
}: {
  label: string
  count: number
  total: number
  colorClass?: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-14 shrink-0 text-right tabular-nums">
        {count} <span className="text-muted-foreground">({pct}%)</span>
      </span>
    </div>
  )
}

function LikertSummary({
  title,
  values,
}: {
  title: string
  values: number[]
}) {
  const total = values.length
  const average =
    total > 0 ? (values.reduce((sum, v) => sum + v, 0) / total).toFixed(2) : '—'

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium leading-snug">{title}</CardTitle>
        <CardDescription>
          Average: <span className="font-semibold text-foreground">{average}</span> / 5
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {LIKERT_OPTIONS.map((option) => (
          <DistributionBar
            key={option.value}
            label={`${option.value} — ${option.label}`}
            count={values.filter((v) => v === option.value).length}
            total={total}
          />
        ))}
      </CardContent>
    </Card>
  )
}

export function SurveyDashboard() {
  const currentQuarter = getQuarterLabel()
  const windowOpen = isSurveyWindowOpen()

  const { data: earliestQuarter } = useEarliestSurveyQuarter()
  const quarters = useMemo(
    () => listQuartersSince(earliestQuarter ?? currentQuarter),
    [earliestQuarter, currentQuarter]
  )
  const [quarter, setQuarter] = useState(currentQuarter)

  const { data: responses, isLoading: responsesLoading } = useSurveyResponses(quarter)
  const { data: completions, isLoading: completionsLoading } = useSurveyCompletions(quarter)
  const { data: profiles, isLoading: profilesLoading } = useProfiles({ status: 'active' })

  const [sendingEmail, setSendingEmail] = useState<'launch' | 'reminder' | 'test' | null>(null)
  const [emailMessage, setEmailMessage] = useState<string | null>(null)
  const [testEmails, setTestEmails] = useState('')

  const isLoading = responsesLoading || completionsLoading || profilesLoading

  const activeProfiles = profiles ?? []
  const completedIds = useMemo(
    () => new Set((completions ?? []).map((c) => c.profile_id)),
    [completions]
  )
  const completedProfiles = activeProfiles.filter((p) => completedIds.has(p.id))
  const pendingProfiles = activeProfiles.filter((p) => !completedIds.has(p.id))
  const completionPct =
    activeProfiles.length > 0
      ? Math.round((completedProfiles.length / activeProfiles.length) * 100)
      : 0

  const responseRows = responses ?? []
  const hasEnoughResponses = responseRows.length >= MIN_RESPONSES_FOR_RESULTS
  const enps = computeEnps(responseRows.map((r) => r.enps_score))
  const comments = responseRows
    .map((r) => r.comment)
    .filter((c): c is string => Boolean(c && c.trim()))

  const handleSendEmail = async (kind: 'launch' | 'reminder') => {
    setSendingEmail(kind)
    setEmailMessage(null)
    const result =
      kind === 'launch' ? await sendSurveyLaunchEmail() : await sendSurveyReminderEmail()
    setSendingEmail(null)
    if (result.success) {
      const sent = (result.data as { sentCount?: number } | undefined)?.sentCount
      setEmailMessage(
        kind === 'launch'
          ? `Launch email sent${typeof sent === 'number' ? ` to ${sent} employees` : ''}.`
          : `Reminder sent${typeof sent === 'number' ? ` to ${sent} pending employees` : ''}.`
      )
    } else {
      setEmailMessage(`Failed to send email: ${result.error ?? 'Unknown error'}`)
    }
  }

  const parsedTestEmails = testEmails
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter(Boolean)
  const testEmailsValid =
    parsedTestEmails.length > 0 &&
    parsedTestEmails.length <= 10 &&
    parsedTestEmails.every((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))

  const handleSendTestEmail = async () => {
    if (!testEmailsValid) return
    setSendingEmail('test')
    setEmailMessage(null)
    const result = await sendSurveyTestEmail(parsedTestEmails)
    setSendingEmail(null)
    if (result.success) {
      const sent = (result.data as { sentCount?: number } | undefined)?.sentCount
      setEmailMessage(
        `Test email sent to ${typeof sent === 'number' ? sent : parsedTestEmails.length} recipient${(sent ?? parsedTestEmails.length) === 1 ? '' : 's'}.`
      )
      setTestEmails('')
    } else {
      setEmailMessage(`Failed to send test email: ${result.error ?? 'Unknown error'}`)
    }
  }

  if (isLoading) {
    return <div>Loading survey results...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header: quarter selector + email actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <CardTitle>Employee Survey — eNPS</CardTitle>
              <CardDescription>
                Anonymous quarterly survey results and completion tracking
              </CardDescription>
            </div>
            <Select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className="w-40"
            >
              {quarters.map((q) => (
                <option key={q} value={q}>
                  {formatQuarterLabel(q)}
                </option>
              ))}
            </Select>
          </div>
        </CardHeader>
        {quarter === currentQuarter && (
          <CardContent>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={windowOpen ? 'default' : 'secondary'}>
                {windowOpen ? 'Survey window open' : 'Survey window closed'}
              </Badge>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendEmail('launch')}
                disabled={sendingEmail !== null || !windowOpen}
              >
                {sendingEmail === 'launch' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send launch email to all
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendEmail('reminder')}
                disabled={sendingEmail !== null || !windowOpen || pendingProfiles.length === 0}
              >
                {sendingEmail === 'reminder' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Send reminder to pending ({pendingProfiles.length})
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <Input
                type="text"
                value={testEmails}
                onChange={(e) => setTestEmails(e.target.value)}
                placeholder="Send a test to specific emails (comma-separated, max 10)"
                className="sm:max-w-md h-9"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendTestEmail}
                disabled={sendingEmail !== null || !testEmailsValid}
              >
                {sendingEmail === 'test' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FlaskConical className="mr-2 h-4 w-4" />
                )}
                Send test email
              </Button>
            </div>
            {emailMessage && (
              <p className="text-sm text-muted-foreground mt-2">{emailMessage}</p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Headline stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              eNPS Score
            </CardDescription>
            <CardTitle className="text-4xl tabular-nums">
              {hasEnoughResponses && enps.score !== null
                ? `${enps.score > 0 ? '+' : ''}${enps.score}`
                : '—'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            % promoters (9–10) minus % detractors (0–6)
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Responses
            </CardDescription>
            <CardTitle className="text-4xl tabular-nums">{responseRows.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Anonymous submissions for {formatQuarterLabel(quarter)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Completion
            </CardDescription>
            <CardTitle className="text-4xl tabular-nums">{completionPct}%</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {completedProfiles.length} of {activeProfiles.length} active employees
          </CardContent>
        </Card>
      </div>

      {!hasEnoughResponses ? (
        <Card>
          <CardContent className="py-10 text-center">
            <ShieldQuestion className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">Results are hidden until at least {MIN_RESPONSES_FOR_RESULTS} responses are in</p>
            <p className="text-sm text-muted-foreground mt-1">
              This protects anonymity when only a few people have responded.
              {responseRows.length > 0 && ` Currently ${responseRows.length} response${responseRows.length === 1 ? '' : 's'}.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* eNPS breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">{SURVEY_QUESTIONS.enps}</CardTitle>
              <CardDescription>0–10 scale</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <DistributionBar
                label="Promoters (9–10)"
                count={enps.promoters}
                total={enps.total}
                colorClass="bg-green-500"
              />
              <DistributionBar
                label="Passives (7–8)"
                count={enps.passives}
                total={enps.total}
                colorClass="bg-yellow-500"
              />
              <DistributionBar
                label="Detractors (0–6)"
                count={enps.detractors}
                total={enps.total}
                colorClass="bg-red-500"
              />
            </CardContent>
          </Card>

          {/* Tenure breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">{SURVEY_QUESTIONS.tenure}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {TENURE_OPTIONS.map((option) => (
                <DistributionBar
                  key={option.value}
                  label={option.label}
                  count={responseRows.filter((r) => r.tenure === option.value).length}
                  total={responseRows.length}
                />
              ))}
            </CardContent>
          </Card>

          {/* Likert questions */}
          <div className="grid gap-4 lg:grid-cols-3">
            <LikertSummary
              title={SURVEY_QUESTIONS.toolsFreedom}
              values={responseRows.map((r) => r.tools_freedom)}
            />
            <LikertSummary
              title={SURVEY_QUESTIONS.livesValues}
              values={responseRows.map((r) => r.lives_values)}
            />
            <LikertSummary
              title={SURVEY_QUESTIONS.safeSeen}
              values={responseRows.map((r) => r.safe_seen)}
            />
          </div>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">{SURVEY_QUESTIONS.comment}</CardTitle>
              <CardDescription>
                {comments.length} comment{comments.length === 1 ? '' : 's'} (anonymous)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground">No comments this quarter.</p>
              )}
              {comments.map((comment, index) => (
                <div key={index} className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap">
                  {comment}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      {/* Completion roster (never joined to responses) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Completion Roster</CardTitle>
          <CardDescription>
            Who has completed the {formatQuarterLabel(quarter)} survey. Completion status is
            tracked separately from answers, so responses stay anonymous.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {activeProfiles.length === 0 && (
              <p className="text-sm text-muted-foreground">No active employees found.</p>
            )}
            {[...pendingProfiles, ...completedProfiles].map((profile) => {
              const completed = completedIds.has(profile.id)
              return (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar>
                      {profile.profile_photo_url && (
                        <AvatarImage src={profile.profile_photo_url} alt={profile.full_name} />
                      )}
                      <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{profile.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{profile.job_title}</p>
                    </div>
                  </div>
                  {completed ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                      <Clock className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
