import { useState } from 'react'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Textarea } from '../components/ui/textarea'
import { cn } from '../lib/utils'
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Lock, CalendarClock } from 'lucide-react'

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
          className={cn(
            'flex sm:flex-col items-center sm:items-center gap-2 sm:gap-1 rounded-lg border p-3 text-sm transition-colors',
            value === option.value
              ? 'border-primary bg-primary/10 font-medium'
              : 'hover:bg-accent'
          )}
        >
          <span className="text-base font-semibold">{option.value}</span>
          <span className="text-xs text-muted-foreground text-left sm:text-center">
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

  const setAnswer = <K extends keyof Answers>(key: K, value: Answers[K]) =>
    setAnswers((prev) => ({ ...prev, [key]: value }))

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
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="text-center">
          <CardHeader>
            <CalendarClock className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
            <CardTitle>The {quarterLabel} survey window has closed</CardTitle>
            <CardDescription>
              The next quarterly employee survey opens on{' '}
              {nextOpen.toLocaleDateString(undefined, {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
              .
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (hasCompleted || step === 'done') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="text-center">
          <CardHeader>
            <CheckCircle2 className="h-10 w-10 mx-auto text-green-600 mb-2" />
            <CardTitle>Thank you for your feedback!</CardTitle>
            <CardDescription>
              You&apos;ve completed the {quarterLabel} employee survey. Your responses were
              recorded anonymously.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (step === 'intro') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Employee Survey — {quarterLabel}</CardTitle>
            <CardDescription>Six quick questions. Takes about two minutes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-relaxed">{SURVEY_INTRO}</p>
            <div className="flex items-start gap-3 rounded-lg border bg-muted/50 p-4">
              <Lock className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{SURVEY_CONFIDENTIALITY_NOTE}</p>
            </div>
            <Button className="w-full" onClick={() => setStep(0)}>
              Start Survey
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const questionIndex = step as number
  const isLastStep = questionIndex === QUESTION_STEPS.length - 1

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>
            Question {questionIndex + 1} of {QUESTION_STEPS.length}
          </span>
          <span>{quarterLabel}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((questionIndex + 1) / QUESTION_STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          {questionIndex === 0 && <CardTitle className="text-xl">{SURVEY_QUESTIONS.tenure}</CardTitle>}
          {questionIndex === 1 && (
            <>
              <CardTitle className="text-xl">{SURVEY_QUESTIONS.enps}</CardTitle>
              <CardDescription>0 = Not at all likely, 10 = Extremely likely</CardDescription>
            </>
          )}
          {questionIndex === 2 && <CardTitle className="text-xl">{SURVEY_QUESTIONS.toolsFreedom}</CardTitle>}
          {questionIndex === 3 && <CardTitle className="text-xl">{SURVEY_QUESTIONS.livesValues}</CardTitle>}
          {questionIndex === 4 && <CardTitle className="text-xl">{SURVEY_QUESTIONS.safeSeen}</CardTitle>}
          {questionIndex === 5 && (
            <>
              <CardTitle className="text-xl">{SURVEY_QUESTIONS.comment}</CardTitle>
              <CardDescription>Optional — leave blank if you have nothing to add.</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {questionIndex === 0 && (
            <div className="grid gap-2">
              {TENURE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAnswer('tenure', option.value)}
                  className={cn(
                    'rounded-lg border p-3 text-sm text-left transition-colors',
                    answers.tenure === option.value
                      ? 'border-primary bg-primary/10 font-medium'
                      : 'hover:bg-accent'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {questionIndex === 1 && (
            <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
              {Array.from({ length: 11 }, (_, score) => (
                <button
                  key={score}
                  type="button"
                  onClick={() => setAnswer('enpsScore', score)}
                  className={cn(
                    'aspect-square rounded-lg border text-sm font-semibold transition-colors',
                    answers.enpsScore === score
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  )}
                >
                  {score}
                </button>
              ))}
            </div>
          )}

          {questionIndex === 2 && (
            <LikertPicker
              value={answers.toolsFreedom}
              onChange={(value) => setAnswer('toolsFreedom', value)}
            />
          )}
          {questionIndex === 3 && (
            <LikertPicker
              value={answers.livesValues}
              onChange={(value) => setAnswer('livesValues', value)}
            />
          )}
          {questionIndex === 4 && (
            <LikertPicker
              value={answers.safeSeen}
              onChange={(value) => setAnswer('safeSeen', value)}
            />
          )}

          {questionIndex === 5 && (
            <Textarea
              value={answers.comment}
              onChange={(e) => setAnswer('comment', e.target.value)}
              placeholder="Share your thoughts..."
              rows={5}
            />
          )}

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
          )}

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setStep(questionIndex === 0 ? 'intro' : ((questionIndex - 1) as Step))}
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
                onClick={() => setStep((questionIndex + 1) as Step)}
                disabled={!isStepAnswered(questionIndex)}
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
