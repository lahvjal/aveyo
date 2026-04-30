import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  useStoreApi,
  getNodesBounds,
  ReactFlowProvider,
  Panel,
} from 'reactflow'
import type { NodeTypes, Connection, Node as RFNode, Edge as RFEdge } from 'reactflow'
import 'reactflow/dist/style.css'
import { EmployeeNode } from './EmployeeNode'
import { OrgChartFlashDeck } from './OrgChartFlashDeck'
import type { OrgChartProfile, Department, OrgChartPosition } from '../../types'
import { useOrgChart } from '../../hooks/useOrgChart'
import {
  useUpdatePosition,
  getDepartmentDescendantIds,
  useClearAllPositions,
  useBatchSavePositions,
  useFlashQuizLeaderboard,
  useCreateFlashQuizScore,
} from '../../lib/queries'
import { Button } from '../ui/button'
import { Save, Loader2, ChevronLeft, ChevronRight, Shuffle } from 'lucide-react'

interface OrgChartCanvasProps {
  profiles: OrgChartProfile[]
  isAdmin: boolean
  currentUserId?: string
  currentUserDepartmentId?: string
  onNodeClick?: (profileId: string | null) => void
  selectedProfileId?: string | null
  searchQuery?: string
  selectedDepartment?: string | null
  allDepartments?: Department[]
  savedPositions?: OrgChartPosition[]
  enableFlashMode?: boolean
  onViewModeChange?: (viewMode: OrgChartViewMode) => void
}

export type OrgChartViewMode = 'chart' | 'flash'

const nodeTypes: NodeTypes = {
  employee: EmployeeNode,
}

const FIT_PADDING = 0.3
/** If fitting everyone would need zoom below this, frame the top of the hierarchy instead. */
const MIN_READABLE_FULL_FIT_ZOOM = 0.26
const MAX_FOCUS_NODES = 18
const FOCUS_FIT_PADDING = 0.38
/** Keep large-department / all-org previews readable (avoid ultra-tight zoom on a tiny subgraph). */
const FOCUS_MIN_ZOOM = 0.22
const FOCUS_MAX_ZOOM = 0.62

function idealFitZoomForBounds(
  bounds: { width: number; height: number },
  width: number,
  height: number,
  padding: number,
): number {
  if (!width || !height || !bounds.width || !bounds.height) return 0
  const xZoom = width / (bounds.width * (1 + padding))
  const yZoom = height / (bounds.height * (1 + padding))
  return Math.min(xZoom, yZoom)
}

/**
 * When the full selection is too large to fit at a readable zoom, keep the camera on the
 * top of the induced org subtree: roots (no in-selection manager), then BFS down manager→report edges.
 */
function pickTopClusterForViewport(flowNodes: RFNode[], edges: RFEdge[], maxNodes: number): RFNode[] {
  const byId = new Map(flowNodes.map((n) => [n.id, n]))
  const candidateIds = new Set(byId.keys())

  const reports = new Map<string, string[]>()
  for (const e of edges) {
    if (!e.source || !e.target) continue
    if (!candidateIds.has(e.source) || !candidateIds.has(e.target)) continue
    const list = reports.get(e.source)
    if (list) list.push(e.target)
    else reports.set(e.source, [e.target])
  }

  const roots = flowNodes
    .filter((n) => {
      const p = n.data?.profile as OrgChartProfile | undefined
      if (!p) return true
      return !p.manager_id || !candidateIds.has(p.manager_id)
    })
    .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)

  const seedIds =
    roots.length > 0
      ? roots.map((r) => r.id)
      : [...flowNodes]
          .sort((a, b) => a.position.y - b.position.y || a.position.x - b.position.x)
          .slice(0, 1)
          .map((n) => n.id)

  const visited = new Set<string>()
  const out: RFNode[] = []
  const queue = [...seedIds]

  while (queue.length > 0 && out.length < maxNodes) {
    const id = queue.shift()!
    if (visited.has(id)) continue
    visited.add(id)
    const node = byId.get(id)
    if (!node) continue
    out.push(node)

    const children = reports.get(id)
    if (!children?.length) continue
    const sortedChildren = children
      .map((cid) => byId.get(cid))
      .filter(Boolean)
      .sort((a, b) => a!.position.y - b!.position.y || a!.position.x - b!.position.x) as RFNode[]

    for (const c of sortedChildren) queue.push(c.id)
  }

  return out
}

function profileMatchesActiveFilters(
  profile: OrgChartProfile,
  departmentMatchIds: Set<string> | null,
  normalizedSearchQuery: string,
) {
  const matchesDepartment = departmentMatchIds
    ? !!(profile.department_id && departmentMatchIds.has(profile.department_id))
    : true

  const matchesSearch = normalizedSearchQuery
    ? (
        profile.full_name.toLowerCase().includes(normalizedSearchQuery) ||
        profile.job_title.toLowerCase().includes(normalizedSearchQuery) ||
        profile.email.toLowerCase().includes(normalizedSearchQuery)
      )
    : true

  return matchesDepartment && matchesSearch
}

function areStringArraysEqual(current: string[], next: string[]) {
  if (current.length !== next.length) return false
  return current.every((value, index) => value === next[index])
}

function reconcileFlashOrder(current: string[], nextProfiles: OrgChartProfile[]) {
  const nextIds = nextProfiles.map((profile) => profile.id)
  const nextIdSet = new Set(nextIds)
  const preserved = current.filter((id) => nextIdSet.has(id))
  const preservedSet = new Set(preserved)
  const appended = nextIds.filter((id) => !preservedSet.has(id))
  return [...preserved, ...appended]
}

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

function OrgChartCanvasInner({ 
  profiles, 
  isAdmin, 
  currentUserId,
  currentUserDepartmentId: _currentUserDepartmentId,
  onNodeClick,
  selectedProfileId,
  searchQuery = '',
  selectedDepartment,
  allDepartments,
  savedPositions,
  enableFlashMode = false,
  onViewModeChange,
}: OrgChartCanvasProps) {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  const [viewMode, setViewMode] = useState<OrgChartViewMode>('chart')
  const [isFlashQuizMode, setIsFlashQuizMode] = useState(false)
  const [currentQuizRun, setCurrentQuizRun] = useState({ answered: 0, correct: 0, averageResponseMs: 0 })
  const [flashOrder, setFlashOrder] = useState<string[]>([])
  const [activeFlashIndex, setActiveFlashIndex] = useState(0)
  const answeredFlashProfilesRef = useRef<Set<string>>(new Set())
  const quizRunTotalsRef = useRef({ answered: 0, correct: 0, totalResponseMs: 0 })

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  const { nodes: initialNodes, edges: initialEdges } = useOrgChart(
    profiles,
    isAdmin,
    currentUserId,
    savedPositions
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const updatePosition = useUpdatePosition()
  const clearAllPositions = useClearAllPositions()
  const batchSavePositions = useBatchSavePositions()
  const createFlashQuizScore = useCreateFlashQuizScore()
  const flashQuizLeaderboardQuery = useFlashQuizLeaderboard({
    enabled: viewMode === 'flash' && isFlashQuizMode,
  })
  const { fitView, getNodes, getEdges } = useReactFlow()
  const storeApi = useStoreApi()
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const departmentMatchIds = useMemo(
    () => (
      selectedDepartment && allDepartments?.length
        ? new Set(getDepartmentDescendantIds(selectedDepartment, allDepartments))
        : null
    ),
    [selectedDepartment, allDepartments],
  )
  const filteredFlashProfiles = useMemo(
    () => profiles.filter((profile) => profileMatchesActiveFilters(profile, departmentMatchIds, normalizedSearchQuery)),
    [profiles, departmentMatchIds, normalizedSearchQuery],
  )

  // Keep a ref to current nodes so fitView effects don't need nodes in their dep arrays
  const nodesRef = useRef(nodes)
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  const previousSelectedProfileIdRef = useRef<string | null | undefined>(selectedProfileId)

  // Store fixed Y positions for each node to enforce horizontal-only dragging
  const nodeYPositions = useRef<Record<string, number>>({})
  
  // Track node positions before drag starts (for swapping)
  const dragStartPositions = useRef<Record<string, { x: number; y: number }>>({})

  // Constants for grid snapping
  const SLOT_WIDTH = 320 // 220px node width + 100px gap (matches dagre nodesep)

  const orderedFlashProfiles = useMemo(() => {
    const byId = new Map(filteredFlashProfiles.map((profile) => [profile.id, profile]))
    const ordered = flashOrder
      .map((id) => byId.get(id))
      .filter(Boolean) as OrgChartProfile[]

    if (ordered.length === filteredFlashProfiles.length) return ordered

    const orderedIds = new Set(ordered.map((profile) => profile.id))
    return [...ordered, ...filteredFlashProfiles.filter((profile) => !orderedIds.has(profile.id))]
  }, [filteredFlashProfiles, flashOrder])
  const activeFlashProfile = orderedFlashProfiles[activeFlashIndex] ?? null

  // Update nodes when profiles change
  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
    
    // Update Y position map when nodes change
    const yPositions: Record<string, number> = {}
    initialNodes.forEach((node) => {
      yPositions[node.id] = node.position.y
    })
    nodeYPositions.current = yPositions
  }, [initialNodes, initialEdges, setNodes, setEdges])

  useEffect(() => {
    if (!enableFlashMode && viewMode !== 'chart') {
      setViewMode('chart')
    }
  }, [enableFlashMode, viewMode])

  useEffect(() => {
    onViewModeChange?.(viewMode)
  }, [viewMode, onViewModeChange])

  useEffect(() => {
    setFlashOrder((current) => {
      const next = reconcileFlashOrder(current, filteredFlashProfiles)
      return areStringArraysEqual(current, next) ? current : next
    })
  }, [filteredFlashProfiles])

  useEffect(() => {
    if (!orderedFlashProfiles.length) {
      setActiveFlashIndex(0)
      return
    }

    setActiveFlashIndex((current) => Math.min(current, orderedFlashProfiles.length - 1))
  }, [orderedFlashProfiles.length])

  useEffect(() => {
    if (selectedProfileId === previousSelectedProfileIdRef.current) return

    previousSelectedProfileIdRef.current = selectedProfileId
    if (!selectedProfileId || !orderedFlashProfiles.length) return

    const selectedIndex = orderedFlashProfiles.findIndex((profile) => profile.id === selectedProfileId)
    if (selectedIndex >= 0) {
      setActiveFlashIndex(selectedIndex)
    }
  }, [selectedProfileId, orderedFlashProfiles])

  useEffect(() => {
    if (viewMode !== 'flash') return

    if (!activeFlashProfile) {
      if (selectedProfileId !== null) onNodeClick?.(null)
      return
    }

    if (selectedProfileId !== activeFlashProfile.id) {
      onNodeClick?.(activeFlashProfile.id)
    }
  }, [viewMode, activeFlashProfile, selectedProfileId, onNodeClick])

  // Pan to selected profile when it changes (e.g. clicked in sidebar search)
  useEffect(() => {
    if (selectedProfileId) {
      fitView({
        nodes: [{ id: selectedProfileId }],
        padding: 0.4,
        duration: 600,
        maxZoom: 1,
      })
    }
  }, [selectedProfileId, fitView])

  // Dim nodes that don't match the active department filter and/or search query
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        const profile = n.data?.profile as OrgChartProfile

        return {
          ...n,
          style: {
            ...n.style,
            opacity: profileMatchesActiveFilters(profile, departmentMatchIds, normalizedSearchQuery) ? 1 : 0.15,
          },
        }
      })
    )
  }, [departmentMatchIds, normalizedSearchQuery, setNodes])

  // Auto-focus the org for the active department filter (or all employees).
  // React Flow clamps `fitView` to `minZoom`; for huge selections the "ideal" zoom is below
  // that floor, which centers on a huge bounding box and looks broken. When that happens,
  // frame only the top of the hierarchy (roots + shallow BFS) at a comfortable zoom so users
  // can pan to find the rest.
  useEffect(() => {
    if (selectedDepartment && !(allDepartments?.length)) return

    const deptMatchIds =
      selectedDepartment && allDepartments?.length
        ? new Set(getDepartmentDescendantIds(selectedDepartment, allDepartments))
        : null

    const candidateIds = new Set(
      nodesRef.current
        .filter((n) => {
          const profile = n.data?.profile as OrgChartProfile | undefined
          if (!profile) return false
          if (deptMatchIds) return !!(profile.department_id && deptMatchIds.has(profile.department_id))
          return true
        })
        .map((n) => n.id),
    )

    if (candidateIds.size === 0) return

    const timeoutId = window.setTimeout(() => {
      const flowNodes = getNodes().filter((n) => candidateIds.has(n.id) && n.width && n.height)
      if (flowNodes.length === 0) return

      const { width, height } = storeApi.getState()
      if (!width || !height) return

      const bounds = getNodesBounds(flowNodes)
      const idealZoom = idealFitZoomForBounds(bounds, width, height, FIT_PADDING)

      if (idealZoom >= MIN_READABLE_FULL_FIT_ZOOM) {
        fitView({
          nodes: flowNodes.map((n) => ({ id: n.id })),
          padding: FIT_PADDING,
          duration: 700,
        })
        return
      }

      const focusNodes = pickTopClusterForViewport(flowNodes, getEdges(), MAX_FOCUS_NODES)
      if (focusNodes.length === 0) return

      fitView({
        nodes: focusNodes.map((n) => ({ id: n.id })),
        padding: FOCUS_FIT_PADDING,
        duration: 700,
        minZoom: FOCUS_MIN_ZOOM,
        maxZoom: FOCUS_MAX_ZOOM,
      })
    }, 80)

    return () => window.clearTimeout(timeoutId)
  }, [selectedDepartment, allDepartments, fitView, getEdges, getNodes, storeApi])

  const onConnect = useCallback(
    (connection: Connection) => {
      if (isAdmin) {
        setEdges((eds) => addEdge(connection, eds))
      }
    },
    [isAdmin, setEdges]
  )

  // Handler for when drag starts - store initial positions
  const handleNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: any) => {
      if (isAdmin) {
        dragStartPositions.current[node.id] = { x: node.position.x, y: node.position.y }
      }
    },
    [isAdmin]
  )

  // Handler during drag - lock Y coordinate to enforce horizontal-only movement
  const handleNodeDrag = useCallback(
    (_event: React.MouseEvent, node: any) => {
      if (isAdmin) {
        const fixedY = nodeYPositions.current[node.id]
        if (fixedY !== undefined) {
          node.position.y = fixedY
        }
      }
    },
    [isAdmin]
  )

  // Handler when drag stops - snap to grid and handle swapping
  const handleNodeDragStop = useCallback(
    async (_event: React.MouseEvent, node: any) => {
      if (!isAdmin) return

      const fixedY = nodeYPositions.current[node.id]
      if (fixedY === undefined) return

      // Snap X to nearest slot
      const snappedX = Math.round(node.position.x / SLOT_WIDTH) * SLOT_WIDTH

      // Find if there's a sibling at the target position (within tolerance)
      const siblings = nodesRef.current.filter(
        (n) => n.id !== node.id && Math.abs(n.position.y - fixedY) < 5
      )

      const collision = siblings.find(
        (sibling) => Math.abs(sibling.position.x - snappedX) < 5
      )

      if (collision && dragStartPositions.current[node.id]) {
        // Swap positions
        const oldPosition = dragStartPositions.current[node.id]

        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === node.id) {
              return { ...n, position: { x: snappedX, y: fixedY } }
            }
            if (n.id === collision.id) {
              return { ...n, position: { x: oldPosition.x, y: fixedY } }
            }
            return n
          })
        )

        // Save both positions to database
        try {
          await Promise.all([
            updatePosition.mutateAsync({
              profile_id: node.id,
              x_position: snappedX,
              y_position: fixedY,
            }),
            updatePosition.mutateAsync({
              profile_id: collision.id,
              x_position: oldPosition.x,
              y_position: fixedY,
            }),
          ])
        } catch (error) {
          console.error('Failed to save swapped positions:', error)
        }
      } else {
        // No collision, just snap to grid
        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === node.id) {
              return { ...n, position: { x: snappedX, y: fixedY } }
            }
            return n
          })
        )

        updatePosition.mutate({
          profile_id: node.id,
          x_position: snappedX,
          y_position: fixedY,
        })
      }
    },
    [isAdmin, updatePosition, setNodes]
  )

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: any) => {
      onNodeClick?.(node.id)
    },
    [onNodeClick]
  )

  const handleSaveCleanLayout = useCallback(async () => {
    if (window.confirm('Save current clean layout? This will clear old positions and save the current dagre layout as the new baseline.')) {
      try {
        // First clear all existing positions
        await clearAllPositions.mutateAsync()
        
        // Then save all current node positions, snapped to grid
        const positions = nodesRef.current.map((node) => {
          const snappedX = Math.round(node.position.x / SLOT_WIDTH) * SLOT_WIDTH
          return {
            profile_id: node.id,
            x_position: snappedX,
            y_position: node.position.y,
          }
        })
        
        await batchSavePositions.mutateAsync(positions)
      } catch (error) {
        console.error('Failed to save clean layout:', error)
      }
    }
  }, [clearAllPositions, batchSavePositions])

  const handleToggleFlashMode = useCallback(() => {
    setViewMode((current) => current === 'flash' ? 'chart' : 'flash')
  }, [])

  const handlePreviousFlashCard = useCallback(() => {
    setActiveFlashIndex((current) => {
      if (!orderedFlashProfiles.length) return 0
      if (isFlashQuizMode) return Math.max(current - 1, 0)
      return current === 0 ? orderedFlashProfiles.length - 1 : current - 1
    })
  }, [isFlashQuizMode, orderedFlashProfiles.length])

  const handleNextFlashCard = useCallback(() => {
    setActiveFlashIndex((current) => {
      if (!orderedFlashProfiles.length) return 0
      if (isFlashQuizMode) return Math.min(current + 1, orderedFlashProfiles.length - 1)
      return (current + 1) % orderedFlashProfiles.length
    })
  }, [isFlashQuizMode, orderedFlashProfiles.length])

  const handleShuffleFlashCards = useCallback(() => {
    setFlashOrder((current) => {
      const source = current.length > 0 ? current : filteredFlashProfiles.map((profile) => profile.id)
      return shuffleValues(source)
    })
    setActiveFlashIndex(0)
  }, [filteredFlashProfiles])

  const resetQuizRun = useCallback(() => {
    answeredFlashProfilesRef.current = new Set()
    quizRunTotalsRef.current = { answered: 0, correct: 0, totalResponseMs: 0 }
    setCurrentQuizRun({ answered: 0, correct: 0, averageResponseMs: 0 })
  }, [])

  useEffect(() => {
    if (!isFlashQuizMode || viewMode !== 'flash') {
      resetQuizRun()
    }
  }, [isFlashQuizMode, viewMode, resetQuizRun])

  useEffect(() => {
    resetQuizRun()
  }, [orderedFlashProfiles.length, resetQuizRun])

  const handleQuizAnswer = useCallback((result: { profileId: string; correct: boolean; responseMs: number }) => {
    if (!isFlashQuizMode || viewMode !== 'flash') return
    if (answeredFlashProfilesRef.current.has(result.profileId)) return

    answeredFlashProfilesRef.current.add(result.profileId)
    const nextAnswered = quizRunTotalsRef.current.answered + 1
    const nextCorrect = quizRunTotalsRef.current.correct + (result.correct ? 1 : 0)
    const nextTotalResponseMs = quizRunTotalsRef.current.totalResponseMs + result.responseMs
    const nextAverageResponseMs = nextAnswered > 0 ? nextTotalResponseMs / nextAnswered : 0

    quizRunTotalsRef.current = {
      answered: nextAnswered,
      correct: nextCorrect,
      totalResponseMs: nextTotalResponseMs,
    }
    setCurrentQuizRun({
      answered: nextAnswered,
      correct: nextCorrect,
      averageResponseMs: nextAverageResponseMs,
    })

    if (orderedFlashProfiles.length === 0 || nextAnswered < orderedFlashProfiles.length) return

    createFlashQuizScore.mutate({
      correct_count: nextCorrect,
      total_questions: nextAnswered,
      average_response_ms: nextAverageResponseMs,
    })

    resetQuizRun()
  }, [createFlashQuizScore, isFlashQuizMode, orderedFlashProfiles.length, resetQuizRun, viewMode])

  return (
    <div className="w-full h-full relative">
      {enableFlashMode && (
        <div
          className={`pointer-events-none absolute left-2 z-20 md:left-4 ${
            isAdmin && viewMode === 'chart' ? 'top-16 md:top-20' : 'top-2 md:top-4'
          }`}
        >
          <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-gray-200 bg-white/95 p-1.5 shadow-md backdrop-blur">
            <Button
              onClick={handleToggleFlashMode}
              variant={viewMode === 'flash' ? 'default' : 'outline'}
              size="sm"
              aria-pressed={viewMode === 'flash'}
            >
              Flash Cards
            </Button>
            {viewMode === 'flash' && (
              <>
                <Button
                  onClick={() => setIsFlashQuizMode((current) => !current)}
                  variant={isFlashQuizMode ? 'default' : 'outline'}
                  size="sm"
                  aria-pressed={isFlashQuizMode}
                  className="h-9"
                >
                  Quiz
                </Button>
                <Button
                  onClick={handlePreviousFlashCard}
                  variant="ghost"
                  size="icon"
                  disabled={
                    orderedFlashProfiles.length <= 1 ||
                    (isFlashQuizMode && activeFlashIndex === 0)
                  }
                  title="Previous card"
                  aria-label="Previous card"
                  className="h-9 w-9"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleShuffleFlashCards}
                  variant="ghost"
                  size="icon"
                  disabled={orderedFlashProfiles.length <= 1}
                  title="Shuffle cards"
                  aria-label="Shuffle cards"
                  className="h-9 w-9"
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
                <Button
                  onClick={handleNextFlashCard}
                  variant="ghost"
                  size="icon"
                  disabled={
                    orderedFlashProfiles.length <= 1 ||
                    (isFlashQuizMode && activeFlashIndex >= orderedFlashProfiles.length - 1)
                  }
                  title="Next card"
                  aria-label="Next card"
                  className="h-9 w-9"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="px-2 text-xs text-muted-foreground whitespace-nowrap">
                  {orderedFlashProfiles.length === 0
                    ? '0 cards'
                    : `${activeFlashIndex + 1} / ${orderedFlashProfiles.length}`}
                </span>
              </>
            )}
          </div>
        </div>
      )}
      {viewMode === 'flash' && isFlashQuizMode && (
        <div className="pointer-events-none absolute right-2 top-2 z-20 md:right-4 md:top-4">
          <div className="pointer-events-auto w-64 rounded-lg border border-gray-200 bg-white/95 p-3 shadow-md backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quiz Leaderboard</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Current: {currentQuizRun.correct}/{currentQuizRun.answered} correct
              {currentQuizRun.answered > 0 ? ` · ${(currentQuizRun.averageResponseMs / 1000).toFixed(2)}s avg` : ''}
            </p>
            <div className="mt-3 space-y-2">
              {flashQuizLeaderboardQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Loading leaderboard...</p>
              ) : !flashQuizLeaderboardQuery.data || flashQuizLeaderboardQuery.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scores yet. Complete a full round to rank.</p>
              ) : (
                flashQuizLeaderboardQuery.data.map((entry, index) => (
                  <div key={entry.id} className="rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
                    <p className="text-xs font-medium text-foreground">
                      #{index + 1} · {entry.player_name} · {entry.correct_count}/{entry.total_questions} correct
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.accuracy_pct.toFixed(0)}% · {(entry.average_response_ms / 1000).toFixed(2)}s avg
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {viewMode === 'chart' ? (
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStart={handleNodeDragStart}
          onNodeDrag={handleNodeDrag}
          onNodeDragStop={handleNodeDragStop}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          nodesDraggable={isAdmin}
          nodesConnectable={false}
          elementsSelectable={true}
          minZoom={0.1}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          {isAdmin && (
            <Panel position="top-left" className="bg-white rounded-lg shadow-md p-2 m-2">
              <Button
                onClick={handleSaveCleanLayout}
                variant="outline"
                size="sm"
                disabled={clearAllPositions.isPending || batchSavePositions.isPending}
                className="flex items-center gap-2"
              >
                {(clearAllPositions.isPending || batchSavePositions.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Clean Layout
              </Button>
            </Panel>
          )}
          {!isMobile && (
            <MiniMap 
              nodeColor={(node: any) => {
                const profile = node.data?.profile as OrgChartProfile
                return profile?.department?.color || '#94a3b8'
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          )}
        </ReactFlow>
      ) : (
        <OrgChartFlashDeck
          profiles={orderedFlashProfiles}
          activeIndex={activeFlashIndex}
          onPrevious={handlePreviousFlashCard}
          onNext={handleNextFlashCard}
          quizEnabled={isFlashQuizMode}
          onQuizAnswer={handleQuizAnswer}
        />
      )}
    </div>
  )
}

export function OrgChartCanvas(props: OrgChartCanvasProps) {
  return (
    <ReactFlowProvider>
      <OrgChartCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
