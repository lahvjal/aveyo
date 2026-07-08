import { useEffect, useRef, useState } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useSurveyStatus, useSubmitSurvey } from '../hooks/useEmployeeSurvey'
import {
  SURVEY_INTRO,
  SURVEY_CONFIDENTIALITY_NOTE,
  SURVEY_QUESTIONS,
  TENURE_OPTIONS,
  LIKERT_OPTIONS,
  formatQuarterLabel,
  getNextWindowOpen,
  type SurveyTenure,
} from '../lib/employeeSurvey'
import { Button } from '../components/ui/button'
import { Card, CardContent } from '../components/ui/card'
import { Textarea } from '../components/ui/textarea'
import { cn } from '../lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Lock,
  CalendarClock,
  ListChecks,
  Timer,
  Check,
} from 'lucide-react'

type Step = 'intro' | 0 | 1 | 2 | 3 | 4 | 5 | 'done'

interface Answers {
  tenure: SurveyTenure | null
  enpsScore: number | null
  toolsFreedom: number | null
  livesValues: number | null
  safeSeen: number | null
  comment: string
}

const QUESTION_STEPS = [0, 1, 2, 3, 4, 5] as const
const AUTO_ADVANCE_DELAY_MS = 350

const stepAnimation = `
@keyframes survey-step-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}
`

function StepShell({
  stepKey,
  children,
}: {
  stepKey: string | number
  children: React.ReactNode
}) {
  return (
    <div key={stepKey} style={{ animation: 'survey-step-in 0.3s ease-out both' }}>
      {children}
    </div>
  )
}

function SegmentedProgress({ current }: { current: number }) {
  return (
    <div
      className="flex gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={QUESTION_STEPS.length}
      aria-valuenow={current + 1}
      aria-label={`Question ${current + 1} of ${QUESTION_STEPS.length}`}
    >
      {QUESTION_STEPS.map((index) => (
        <div
          key={index}
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors duration-300',
            index < current ? 'bg-primary' : index === current ? 'bg-primary/60' : 'bg-muted'
          )}
        />
      ))}
    </div>
  )
}

function LikertPicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (value: number) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
      {LIKERT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'group flex sm:flex-col items-center gap-3 sm:gap-1.5 rounded-xl border p-3 sm:py-4 text-sm transition-all duration-150',
            value === option.value
              ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
              : 'hover:border-primary/40 hover:bg-accent'
          )}
        >
          <span
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
              value === option.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground group-hover:bg-background'
            )}
          >
            {option.value}
          </span>
          <span className="text-xs text-muted-foreground text-left sm:text-center leading-tight">
            {option.label}
          </span>
        </button>
      ))}
    </div>
  )
}

export default function EmployeeSurvey() {
  usePageTitle('Employee Survey')
  const { quarter, windowOpen, hasCompleted, isLoading } = useSurveyStatus()
  const submitSurvey = useSubmitSurvey()

  const [step, setStep] = useState<Step>('intro')
  const [answers, setAnswers] = useState<Answers>({
    tenure: null,
    enpsScore: null,
    toolsFreedom: null,
    livesValues: null,
    safeSeen: null,
    comment: '',
  })
  const [submitError, setSubmitError] = useState<string | null>(null)
  const advanceTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (advanceTimeout.current) clearTimeout(advanceTimeout.current)
    }
  }, [])

  const setAnswer = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setAnswers((prev) => ({ ...prev, [key]: value }))

  /** Select an answer and glide to the next question after a brief pause. */
  const selectAndAdvance = <K extends keyof Answers>(
    key: K,
    value: Answers[K],
    questionIndex: number
  ) => {
    setAnswer(key, value)
    if (advanceTimeout.current) clearTimeout(advanceTimeout.current)
    if (questionIndex < QUESTION_STEPS.length - 1) {
      advanceTimeout.current = setTimeout(() => {
        setStep((current) =>
          current === questionIndex ? ((questionIndex + 1) as Step) : current
        )
      }, AUTO_ADVANCE_DELAY_MS)
    }
  }

  const goToStep = (next: Step) => {
    if (advanceTimeout.current) clearTimeout(advanceTimeout.current)
    setStep(next)
  }

  const isStepAnswered = (questionIndex: number): boolean => {
    switch (questionIndex) {
      case 0:
        return answers.tenure !== null
      case 1:
        return answers.enpsScore !== null
      case 2:
        return answers.toolsFreedom !== null
      case 3:
        return answers.livesValues !== null
      case 4:
        return answers.safeSeen !== null
      case 5:
        return true // comment is optional
      default:
        return false
    }
  }

  const handleSubmit = async () => {
    if (
      answers.tenure === null ||
      answers.enpsScore === null ||
      answers.toolsFreedom === null ||
      answers.livesValues === null ||
      answers.safeSeen === null
    ) {
      return
    }

    setSubmitError(null)
    try {
      await submitSurvey.mutateAsync({
        tenure: answers.tenure,
        enpsScore: answers.enpsScore,
        toolsFreedom: answers.toolsFreedom,
        livesValues: answers.livesValues,
        safeSeen: answers.safeSeen,
        comment: answers.comment,
      })
      setStep('done')
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : 'Something went wrong submitting your survey.'
      )
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  const quarterLabel = formatQuarterLabel(quarter)

  if (!windowOpen) {
    const nextOpen = getNextWindowOpen()
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl flex-col justify-center px-4 py-10">
        <style>{stepAnimation}</style>
        <StepShell stepKey="closed">
          <Card className="w-full text-center">
            <CardContent className="flex flex-col items-center gap-3 px-8 py-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <CalendarClock className="h-7 w-7 text-muted-foreground" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">
                The {quarterLabel} survey window has closed
              </h1>
              <p className="text-sm text-muted-foreground max-w-sm">
                The next quarterly employee survey opens on{' '}
                <span className="font-medium text-foreground">
                  {nextOpen.toLocaleDateString(undefined, {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                . We&apos;ll let you know when it&apos;s live.
              </p>
            </CardContent>
          </Card>
        </StepShell>
      </div>
    )
  }

  if (hasCompleted || step === 'done') {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl flex-col justify-center px-4 py-10">
        <style>{stepAnimation}</style>
        <StepShell stepKey="done">
          <Card className="w-full text-center">
            <CardContent className="flex flex-col items-center gap-3 px-8 py-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-600/10">
                <CheckCircle2 className="h-7 w-7 text-green-600" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">Thank you for your feedback!</h1>
              <p className="text-sm text-muted-foreground max-w-sm">
                You&apos;ve completed the {quarterLabel} employee survey.
              </p>
              <div className="mt-2 flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
                Your responses were recorded anonymously
              </div>
            </CardContent>
          </Card>
        </StepShell>
      </div>
    )
  }

  if (step === 'intro') {
    return (
      <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl flex-col justify-center px-4 py-10">
        <style>{stepAnimation}</style>
        <StepShell stepKey="intro">
          <Card>
            <CardContent className="px-6 py-10 sm:px-10">
              <div className="flex flex-col items-center text-center">
                <span className="inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {quarterLabel} · Quarterly Survey
                </span>
                <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                  Employee Survey
                </h1>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <ListChecks className="h-4 w-4" />6 questions
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Timer className="h-4 w-4" />
                    ~2 minutes
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Lock className="h-4 w-4" />
                    Anonymous
                  </span>
                </div>
              </div>

              <p className="mt-8 text-sm leading-relaxed text-muted-foreground">{SURVEY_INTRO}</p>

              <div className="mt-5 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <Lock className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <p className="text-sm leading-relaxed">{SURVEY_CONFIDENTIALITY_NOTE}</p>
              </div>

              <Button size="lg" className="mt-8 w-full" onClick={() => goToStep(0)}>
                Start Survey
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </StepShell>
      </div>
    )
  }

  const questionIndex = step as number
  const isLastStep = questionIndex === QUESTION_STEPS.length - 1

  const questionTitle = [
    SURVEY_QUESTIONS.tenure,
    SURVEY_QUESTIONS.enps,
    SURVEY_QUESTIONS.toolsFreedom,
    SURVEY_QUESTIONS.livesValues,
    SURVEY_QUESTIONS.safeSeen,
    SURVEY_QUESTIONS.comment,
  ][questionIndex]

  const questionHint = [
    null,
    null,
    null,
    null,
    null,
    'Optional — leave blank if you have nothing to add.',
  ][questionIndex]

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl flex-col justify-center px-4 py-10">
      <style>{stepAnimation}</style>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="uppercase tracking-wide">
            Question {questionIndex + 1} of {QUESTION_STEPS.length}
          </span>
          <span>{quarterLabel}</span>
        </div>
        <SegmentedProgress current={questionIndex} />
      </div>

      <StepShell stepKey={questionIndex}>
        <Card>
          <CardContent className="px-6 py-8 sm:px-8">
            <h2 className="text-lg font-semibold leading-snug tracking-tight sm:text-xl">
              {questionTitle}
            </h2>
            {questionHint && <p className="mt-1.5 text-sm text-muted-foreground">{questionHint}</p>}

            <div className="mt-6 space-y-6">
              {questionIndex === 0 && (
                <div className="grid gap-2">
                  {TENURE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => selectAndAdvance('tenure', option.value, 0)}
                      aria-pressed={answers.tenure === option.value}
                      className={cn(
                        'flex items-center justify-between rounded-xl border p-3.5 text-sm text-left transition-all duration-150',
                        answers.tenure === option.value
                          ? 'border-primary bg-primary/10 font-medium ring-1 ring-primary'
                          : 'hover:border-primary/40 hover:bg-accent'
                      )}
                    >
                      {option.label}
                      {answers.tenure === option.value && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {questionIndex === 1 && (
                <div>
                  <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5 sm:gap-2">
                    {Array.from({ length: 11 }, (_, score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => selectAndAdvance('enpsScore', score, 1)}
                        aria-pressed={answers.enpsScore === score}
                        className={cn(
                          'aspect-square rounded-lg border text-sm font-semibold transition-all duration-150',
                          answers.enpsScore === score
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm scale-105'
                            : 'hover:border-primary/40 hover:bg-accent'
                        )}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>Not at all likely</span>
                    <span>Extremely likely</span>
                  </div>
                </div>
              )}

              {questionIndex === 2 && (
                <LikertPicker
                  value={answers.toolsFreedom}
                  onChange={(value) => selectAndAdvance('toolsFreedom', value, 2)}
                />
              )}
              {questionIndex === 3 && (
                <LikertPicker
                  value={answers.livesValues}
                  onChange={(value) => selectAndAdvance('livesValues', value, 3)}
                />
              )}
              {questionIndex === 4 && (
                <LikertPicker
                  value={answers.safeSeen}
                  onChange={(value) => selectAndAdvance('safeSeen', value, 4)}
                />
              )}

              {questionIndex === 5 && (
                <Textarea
                  value={answers.comment}
                  onChange={(e) => setAnswer('comment', e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={5}
                  autoFocus
                />
              )}

              {submitError && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {submitError}
                </div>
              )}

              <div className="flex items-center justify-between border-t pt-5">
                <Button
                  variant="ghost"
                  onClick={() => goToStep(questionIndex === 0 ? 'intro' : ((questionIndex - 1) as Step))}
                  disabled={submitSurvey.isPending}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                {isLastStep ? (
                  <Button onClick={handleSubmit} disabled={submitSurvey.isPending}>
                    {submitSurvey.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Submit Survey
                  </Button>
                ) : (
                  <Button
                    onClick={() => goToStep((questionIndex + 1) as Step)}
                    disabled={!isStepAnswered(questionIndex)}
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </StepShell>
    </div>
  )
}
