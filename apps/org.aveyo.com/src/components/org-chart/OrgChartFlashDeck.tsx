import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { OrgChartProfile } from '../../types'
import { cn } from '../../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { EmployeeCardFace } from './EmployeeCardFace'

const SWIPE_THRESHOLD = 84
const FLASH_CARD_WIDTH = 320
const FLASH_CARD_HEIGHT = 360
const STACK_OFFSET = 16
const REVEAL_DISTANCE = FLASH_CARD_WIDTH * 0.65

interface OrgChartFlashDeckProps {
  profiles: OrgChartProfile[]
  activeIndex: number
  onNext: () => void
  onPrevious: () => void
}

export function OrgChartFlashDeck({
  profiles,
  activeIndex,
  onNext,
  onPrevious,
}: OrgChartFlashDeckProps) {
  const activeProfile = profiles[activeIndex] ?? null
  const hasMultipleProfiles = profiles.length > 1
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const activePointerIdRef = useRef<number | null>(null)

  const resetDragState = () => {
    dragStartRef.current = null
    activePointerIdRef.current = null
    setDragOffset(0)
    setIsDragging(false)
  }

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!hasMultipleProfiles) return
    dragStartRef.current = { x: event.clientX, y: event.clientY }
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

  const maybeCommitSwipe = (deltaX: number, deltaY: number) => {
    if (!hasMultipleProfiles) return
    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return
    if (Math.abs(deltaX) < Math.abs(deltaY)) return

    if (deltaX < 0) onNext()
    else onPrevious()
  }

  const handlePointerRelease = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId || !dragStartRef.current) return

    const deltaX = event.clientX - dragStartRef.current.x
    const deltaY = event.clientY - dragStartRef.current.y
    maybeCommitSwipe(deltaX, deltaY)

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
            {hasMultipleProfiles
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
      </div>
    </div>
  )
}
