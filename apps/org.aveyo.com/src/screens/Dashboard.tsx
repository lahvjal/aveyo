import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useProfiles, useProfile } from '../hooks/useProfile'
import { usePermissions } from '../hooks/usePermissions'
import { useAuth } from '../hooks/useAuth'
import { usePageTitle } from '../hooks/usePageTitle'
import { OrgChartCanvas } from '../components/org-chart/OrgChartCanvas'
import { EmployeeSearch } from '../components/search/EmployeeSearch'
import { ProfileCard } from '../components/profile/ProfileCard'
import { AdminUserEditorDialog } from '../components/admin/AdminUserEditorDialog'
import { SurveyBanner } from '../components/survey/SurveyBanner'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { X, SlidersHorizontal, PanelLeftClose, PanelLeftOpen } from 'lucide-react'

const FILTER_PANEL_STORAGE_KEY = 'org-chart-filter-panel-collapsed'
import { useDepartments, getDepartmentDescendantIds, useOrgChartPositions } from '../lib/queries'

export default function Dashboard() {
  const { user } = useAuth()
  const { data: currentProfile } = useProfile()
  const { isAdmin, isLoading: permissionsLoading } = usePermissions()
  usePageTitle('Org Chart')
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [editingProfile, setEditingProfile] = useState<string | null>(null)
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [filterPanelCollapsed, setFilterPanelCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isFlashMode, setIsFlashMode] = useState(false)
  const hasInitializedDepartment = useRef(false)

  const { data: allProfiles, isLoading: allProfilesLoading, error: allProfilesError } = useProfiles()
  const { data: allDepartments } = useDepartments()
  const { data: savedPositions } = useOrgChartPositions()

  // Set initial department filter when currentProfile loads (only once)
  useEffect(() => {
    if (!hasInitializedDepartment.current && currentProfile?.department_id) {
      setSelectedDepartment(currentProfile.department_id)
      hasInitializedDepartment.current = true
    }
  }, [currentProfile?.department_id])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(FILTER_PANEL_STORAGE_KEY)
      if (stored === 'true') {
        setFilterPanelCollapsed(true)
      }
    } catch {
      // ignore storage errors
    }
  }, [])

  const toggleFilterPanelCollapsed = useCallback(() => {
    setFilterPanelCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem(FILTER_PANEL_STORAGE_KEY, String(next))
      } catch {
        // ignore storage errors
      }
      return next
    })
  }, [])

  console.log('Dashboard: user:', user?.id)
  console.log('Dashboard: currentProfile:', currentProfile)
  console.log('Dashboard: isAdmin:', isAdmin, 'permissionsLoading:', permissionsLoading)

  const profiles = useMemo(() => {
    if (!allProfiles) return []
    if (!selectedDepartment) return allProfiles
    const matchingIds = new Set(
      getDepartmentDescendantIds(selectedDepartment, allDepartments || []),
    )
    return allProfiles.filter((profile) => profile.department_id && matchingIds.has(profile.department_id))
  }, [allProfiles, selectedDepartment, allDepartments])

  const isLoading = permissionsLoading || allProfilesLoading

  console.log('Dashboard: allProfiles:', allProfiles, 'loading:', allProfilesLoading, 'error:', allProfilesError)
  console.log('Dashboard: Final - profiles:', profiles, 'isLoading:', isLoading)

  const selectedProfile = allProfiles?.find((p) => p.id === selectedProfileId)
  const profileBeingEdited = allProfiles?.find((p) => p.id === editingProfile) ?? null
  const handleViewModeChange = useCallback((viewMode: 'chart' | 'flash') => {
    const nextIsFlashMode = viewMode === 'flash'
    setIsFlashMode((current) => current === nextIsFlashMode ? current : nextIsFlashMode)
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (!allProfiles || allProfiles.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">No Employees Found</h2>
          <p className="text-muted-foreground mb-4">
            {isAdmin
              ? "Get started by creating employee profiles in the admin panel."
              : "Your org chart is empty. Please contact an administrator."}
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <SurveyBanner />
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
      {/* Mobile: filter toggle bar */}
      <div className="md:hidden flex items-center gap-2 px-4 py-2 border-b bg-white shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSidebarOpen((v) => !v)}
          className="flex items-center gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {sidebarOpen ? 'Hide Filters' : 'Search & Filter'}
        </Button>
        {selectedDepartment && (
          <span className="text-xs text-muted-foreground">
            Focusing on {profiles.length} employee{profiles.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Sidebar */}
      <div
        className={`
          bg-white border-b md:border-b-0 md:border-r md:h-full shrink-0
          transition-[width] duration-200 ease-in-out
          ${sidebarOpen ? 'block' : 'hidden md:flex md:flex-col'}
          ${filterPanelCollapsed ? 'md:w-12' : 'md:w-80'}
        `}
      >
        {/* Desktop collapse toggle */}
        <div
          className={`hidden md:flex shrink-0 items-center border-b px-2 py-2 ${
            filterPanelCollapsed ? 'justify-center' : 'justify-end'
          }`}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFilterPanelCollapsed}
            title={filterPanelCollapsed ? 'Show search & filters' : 'Hide search & filters'}
            aria-label={filterPanelCollapsed ? 'Show search & filters' : 'Hide search & filters'}
            aria-expanded={!filterPanelCollapsed}
            className="h-8 w-8"
          >
            {filterPanelCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div
          className={`flex-1 overflow-y-auto p-4 ${
            filterPanelCollapsed ? 'md:hidden' : ''
          }`}
        >
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Organization Chart</h2>
            <p className="text-sm text-muted-foreground">
              {selectedDepartment
                ? `Focusing on ${profiles.length} of ${allProfiles?.length || 0} employees`
                : `Browse and search ${allProfiles?.length || 0} employees`}
            </p>
          </div>

          <EmployeeSearch
            profiles={allProfiles || []}
            departments={allDepartments || []}
            onSelectEmployee={(id) => {
              setSelectedProfileId(id)
              setSidebarOpen(false) // Close sidebar on mobile after selecting
            }}
            currentUserDepartmentId={currentProfile?.department_id || undefined}
            selectedDepartment={selectedDepartment}
            onDepartmentChange={setSelectedDepartment}
            onSearchChange={setSearchQuery}
          />
        </div>
      </div>

      {/* Main content - Org Chart */}
      <div className="flex-1 relative min-h-0">
        {profiles.length === 0 && selectedDepartment ? (
          <div className="flex items-center justify-center h-full">
            <Card className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">No Employees in Selected Department</h2>
              <p className="text-muted-foreground mb-4">
                Try selecting a different department or view all departments.
              </p>
            </Card>
          </div>
        ) : (
          <OrgChartCanvas
            profiles={allProfiles || []}
            isAdmin={isAdmin}
            currentUserId={user?.id}
            currentUserDepartmentId={currentProfile?.department_id || undefined}
            onNodeClick={setSelectedProfileId}
            selectedProfileId={selectedProfileId}
            searchQuery={searchQuery}
            selectedDepartment={selectedDepartment}
            allDepartments={allDepartments || []}
            savedPositions={savedPositions}
            enableFlashMode
            onViewModeChange={handleViewModeChange}
          />
        )}

        {/* Selected profile detail */}
        {selectedProfile && !isFlashMode && (
          <div className="absolute top-2 right-2 left-2 md:left-auto md:top-4 md:right-4 md:w-96 max-h-[calc(100%-1rem)] overflow-y-auto z-10">
            <div className="relative bg-white shadow-lg rounded-lg">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10"
                onClick={() => setSelectedProfileId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
              <ProfileCard
                profile={selectedProfile}
                onEdit={() => setEditingProfile(selectedProfile.id)}
              />
            </div>
          </div>
        )}

        <AdminUserEditorDialog
          profile={profileBeingEdited}
          open={!!editingProfile}
          onOpenChange={(open) => !open && setEditingProfile(null)}
        />
      </div>
      </div>
    </div>
  )
}
