import { useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { OrgChartProfile } from '../../types'
import { cn, getInitials } from '../../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { EmployeeCardFace } from './EmployeeCardFace'
import { Button } from '../ui/button'

const SWIPE_THRESHOLD = 36
const FLICK_MIN_DISTANCE = 12
const FLICK_VELOCITY_THRESHOLD = 0.35
const FLASH_CARD_WIDTH = 320
const FLASH_CARD_HEIGHT = 360
const STACK_OFFSET = 16
const REVEAL_DISTANCE = FLASH_CARD_WIDTH * 0.65

interface OrgChartFlashDeckProps {
  profiles: OrgChartProfile[]
  activeIndex: number
  onNext: () => void
  onPrevious: () => void
  quizEnabled?: boolean
}

type QuizQuestionType = 'name' | 'photo'

function shuffleValues<T>(values: T[]) {
  const shuffled = [...values]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const currentValue = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = currentValue
  }
  return shuffled
}

export function OrgChartFlashDeck({
  profiles,
  activeIndex,
  onNext,
  onPrevious,
  quizEnabled = false,
}: OrgChartFlashDeckProps) {
  const activeProfile = profiles[activeIndex] ?? null
  const hasMultipleProfiles = profiles.length > 1
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null)
  const dragStartRef = useRef<{ x: number; y: number; startedAt: number } | null>(null)
  const activePointerIdRef = useRef<number | null>(null)

  const questionType = useMemo<QuizQuestionType>(() => {
    if (!quizEnabled || !activeProfile) return 'name'
    if (profiles.length < 3) return 'name'
    return Math.random() < 0.5 ? 'name' : 'photo'
  }, [quizEnabled, activeProfile?.id, activeIndex, profiles.length])

  useEffect(() => {
    setSelectedAnswer(null)
    setIsAnswerCorrect(null)
  }, [activeIndex, quizEnabled, questionType])

  useEffect(() => {
    if (!hasMultipleProfiles) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.tagName === 'SELECT')
      ) {
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        onPrevious()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        onNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasMultipleProfiles, onNext, onPrevious])

  const nameOptions = useMemo(() => {
    if (!quizEnabled || !activeProfile) return []

    const incorrectNames = Array.from(
      new Set(
        profiles
          .filter((profile) => profile.id !== activeProfile.id)
          .map((profile) => profile.full_name)
          .filter((name) => name !== activeProfile.full_name),
      ),
    )
    const distractors = shuffleValues(incorrectNames).slice(0, 2)
    return shuffleValues([activeProfile.full_name, ...distractors]).slice(0, 3)
  }, [profiles, activeProfile, quizEnabled])

  const photoOptions = useMemo(() => {
    if (!quizEnabled || !activeProfile) return []

    const distractors = shuffleValues(
      profiles.filter((profile) => profile.id !== activeProfile.id),
    ).slice(0, 2)

    return shuffleValues([activeProfile, ...distractors]).slice(0, 3)
  }, [profiles, activeProfile, quizEnabled])

  const isQuizAnswered = selectedAnswer !== null
  const isNameQuestion = questionType === 'name'
  const shouldObscureText = quizEnabled && !isQuizAnswered && isNameQuestion
  const shouldObscurePhoto = quizEnabled && !isQuizAnswered && !isNameQuestion
  const shouldBlackoutPhoto = shouldObscurePhoto

  const resetDragState = () => {
    dragStartRef.current = null
    activePointerIdRef.current = null
    setDragOffset(0)
    setIsDragging(false)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!hasMultipleProfiles) return
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      startedAt: performance.now(),
    }
    activePointerIdRef.current = event.pointerId
    setIsDragging(true)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging || activePointerIdRef.current !== event.pointerId || !dragStartRef.current) return

    const deltaX = event.clientX - dragStartRef.current.x
    const deltaY = event.clientY - dragStartRef.current.y

    if (Math.abs(deltaX) >= Math.abs(deltaY) || Math.abs(deltaX) > 12) {
      setDragOffset(deltaX)
    }
  }

  const maybeCommitSwipe = (deltaX: number, deltaY: number, elapsedMs: number) => {
    if (!hasMultipleProfiles) return
    if (Math.abs(deltaX) < Math.abs(deltaY)) return

    const absoluteDeltaX = Math.abs(deltaX)
    const velocity = elapsedMs > 0 ? absoluteDeltaX / elapsedMs : 0
    const isDistanceSwipe = absoluteDeltaX >= SWIPE_THRESHOLD
    const isQuickFlick =
      absoluteDeltaX >= FLICK_MIN_DISTANCE && velocity >= FLICK_VELOCITY_THRESHOLD

    if (!isDistanceSwipe && !isQuickFlick) return

    if (deltaX < 0) onNext()
    else onPrevious()
  }

  const handlePointerRelease = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId || !dragStartRef.current) return

    const deltaX = event.clientX - dragStartRef.current.x
    const deltaY = event.clientY - dragStartRef.current.y
    const elapsedMs = performance.now() - dragStartRef.current.startedAt
    maybeCommitSwipe(deltaX, deltaY, elapsedMs)

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    resetDragState()
  }

  if (!activeProfile) {
    return (
      <div className="flex h-full items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6 py-10">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>No flash cards to show</CardTitle>
            <CardDescription>
              No employees match the current search and department filters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Adjust the filters in the sidebar or switch back to the org chart to browse everyone.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const stackDepth = Math.min(Math.max(profiles.length - 1, 0), 2)
  const stackHeight = FLASH_CARD_HEIGHT + stackDepth * STACK_OFFSET
  const swipeProgress = Math.min(Math.abs(dragOffset) / REVEAL_DISTANCE, 1)
  const revealIndex = hasMultipleProfiles
    ? dragOffset > 0
      ? (activeIndex - 1 + profiles.length) % profiles.length
      : (activeIndex + 1) % profiles.length
    : -1
  const revealProfile = revealIndex >= 0 ? profiles[revealIndex] ?? null : null
  const trailingIndex = hasMultipleProfiles && profiles.length > 2
    ? dragOffset > 0
      ? (revealIndex - 1 + profiles.length) % profiles.length
      : (revealIndex + 1) % profiles.length
    : -1
  const trailingProfile = trailingIndex >= 0 ? profiles[trailingIndex] ?? null : null
  const revealTranslateY = STACK_OFFSET * (1 - swipeProgress)
  const revealScale = 0.96 + swipeProgress * 0.04
  const revealOpacity = 0.5 + swipeProgress * 0.5
  const activeOpacity = 1 - swipeProgress * 0.45

  return (
    <div className="flex h-full items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-white px-6 py-10 sm:px-10">
      <div className="w-full max-w-2xl select-none">
        <div className="mb-7 text-center">
          <p className="text-base font-medium text-foreground">
            Card {activeIndex + 1} of {profiles.length}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {quizEnabled
              ? isNameQuestion
                ? 'Select the correct name. Only the card text is hidden.'
                : 'Select the correct photo. Only the card photo is hidden.'
              : hasMultipleProfiles
                ? 'Swipe left or right to move through the deck.'
                : 'Only one employee matches the current filters.'}
          </p>
        </div>

        <div
          className="relative mx-auto"
          style={{
            width: FLASH_CARD_WIDTH,
            height: stackHeight,
          }}
        >
          {trailingProfile && (
            <EmployeeCardFace
              profile={trailingProfile}
              size="flash"
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 z-0"
              style={{
                transform: `translateY(${STACK_OFFSET * 2}px) scale(0.92)`,
                opacity: 0.18,
              }}
            />
          )}

          {!trailingProfile && stackDepth > 1 && (
            <div
              className="absolute left-0 top-0 z-0 rounded-lg border-2 border-gray-200 bg-white shadow-sm"
              style={{
                width: FLASH_CARD_WIDTH,
                height: FLASH_CARD_HEIGHT,
                transform: `translateY(${STACK_OFFSET * 2}px) scale(0.92)`,
                opacity: 0.18,
              }}
            />
          )}

          {revealProfile && (
            <EmployeeCardFace
              profile={revealProfile}
              size="flash"
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute left-0 top-0 z-[1] transition-[transform,opacity] duration-200 ease-out',
                isDragging && 'transition-none',
              )}
              style={{
                transform: `translateY(${revealTranslateY}px) scale(${revealScale})`,
                opacity: revealOpacity,
              }}
            />
          )}

          {!revealProfile && stackDepth > 0 && (
            <div
              className={cn(
                'absolute left-0 top-0 z-[1] rounded-lg border-2 border-gray-200 bg-white shadow-sm transition-[transform,opacity] duration-200 ease-out',
                isDragging && 'transition-none',
              )}
              style={{
                width: FLASH_CARD_WIDTH,
                height: FLASH_CARD_HEIGHT,
                transform: `translateY(${revealTranslateY}px) scale(${revealScale})`,
                opacity: revealOpacity * 0.45,
              }}
            />
          )}

          <EmployeeCardFace
            profile={activeProfile}
            size="flash"
            obscurePhoto={shouldObscurePhoto}
            obscureText={shouldObscureText}
            blackoutPhoto={shouldBlackoutPhoto}
            role="group"
            aria-label={`Flash card ${activeIndex + 1} of ${profiles.length}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerRelease}
            onPointerCancel={resetDragState}
            onLostPointerCapture={resetDragState}
            className={cn(
              'absolute left-0 top-0 z-10 touch-pan-y transition-[transform,opacity] duration-200 ease-out',
              hasMultipleProfiles && 'cursor-grab active:cursor-grabbing',
              isDragging && 'transition-none',
            )}
            style={{
              transform: `translateX(${dragOffset}px) rotate(${dragOffset / 18}deg)`,
              opacity: activeOpacity,
            }}
          />
        </div>

        {quizEnabled && (
          <div className="mx-auto mt-6 w-full max-w-md rounded-lg border bg-white/90 p-4 shadow-sm backdrop-blur">
            <p className="text-sm font-medium text-foreground">
              {isNameQuestion
                ? 'Who is this person?'
                : `Which photo matches ${activeProfile.full_name}?`}
            </p>
            {isNameQuestion ? (
              <div className="mt-3 grid gap-2">
                {nameOptions.map((option) => {
                  const isSelected = selectedAnswer === option
                  const isCorrectOption = activeProfile?.full_name === option
                  const showCorrectState = isQuizAnswered && isCorrectOption
                  const showWrongState = isQuizAnswered && isSelected && !isCorrectOption

                  return (
                    <Button
                      key={option}
                      type="button"
                      variant="outline"
                      disabled={isQuizAnswered}
                      onClick={() => {
                        const correct = option === activeProfile?.full_name
                        setSelectedAnswer(option)
                        setIsAnswerCorrect(correct)
                      }}
                      className={cn(
                        'justify-start',
                        showCorrectState && 'border-emerald-600 bg-emerald-50 text-emerald-900 hover:bg-emerald-50',
                        showWrongState && 'border-rose-600 bg-rose-50 text-rose-900 hover:bg-rose-50',
                      )}
                    >
                      {option}
                    </Button>
                  )
                })}
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {photoOptions.map((option) => {
                  const isSelected = selectedAnswer === option.id
                  const isCorrectOption = activeProfile?.id === option.id
                  const showCorrectState = isQuizAnswered && isCorrectOption
                  const showWrongState = isQuizAnswered && isSelected && !isCorrectOption

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={isQuizAnswered}
                      onClick={() => {
                        const correct = option.id === activeProfile?.id
                        setSelectedAnswer(option.id)
                        setIsAnswerCorrect(correct)
                      }}
                      className={cn(
                        'group relative overflow-hidden rounded-md border bg-gray-100 text-left transition-colors',
                        isQuizAnswered ? 'cursor-default' : 'cursor-pointer',
                        showCorrectState && 'border-emerald-600 ring-2 ring-emerald-200',
                        showWrongState && 'border-rose-600 ring-2 ring-rose-200',
                      )}
                      aria-label={`Photo option: ${option.full_name}`}
                    >
                      {option.profile_photo_url ? (
                        <img
                          src={option.profile_photo_url}
                          alt={option.full_name}
                          className="h-20 w-full object-cover"
                          draggable={false}
                        />
                      ) : (
                        <div className="flex h-20 w-full items-center justify-center bg-gray-200 text-lg font-semibold text-gray-600">
                          {getInitials(option.full_name)}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
            {isQuizAnswered && (
              <p
                className={cn(
                  'mt-3 text-sm font-medium',
                  isAnswerCorrect ? 'text-emerald-700' : 'text-rose-700',
                )}
              >
                {isAnswerCorrect
                  ? 'Correct! Card details are now revealed.'
                  : isNameQuestion
                    ? `Not quite. This is ${activeProfile?.full_name}.`
                    : 'Not quite. The correct photo is highlighted.'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
