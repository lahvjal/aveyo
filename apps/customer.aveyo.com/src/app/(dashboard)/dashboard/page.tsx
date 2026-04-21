'use client';

import { useEffect, useMemo, useState } from 'react';
import '@/styles/brand-colors.css';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { Project } from '@/types';
import { getProjectHomePhotoUrl } from '@/utils/projectUtils';
import { getNextMilestoneDisplayName } from '@/utils/milestoneUtils';
import { useProjects } from '@/context/ProjectsContext';
import { useAuth } from '@/context/AuthContext';
import { analytics } from '@/lib/analytics';
import {
  getDashboardStageSections,
  getNextMilestoneDescription,
  getProjectStatusSnapshot
} from '@/utils/customerDashboardUtils';

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

function StageMenuDots({ active = false }: { active?: boolean }) {
  return (
    <div className="absolute right-5 top-5 flex items-center gap-1">
      <span className={`h-1 w-1 rounded-full ${active ? 'bg-[var(--customer-color-text-primary)]' : 'bg-[var(--customer-color-text-muted)]'}`}></span>
      <span className={`h-1 w-1 rounded-full ${active ? 'bg-[var(--customer-color-text-primary)]' : 'bg-[var(--customer-color-text-muted)]'}`}></span>
      <span className={`h-1 w-1 rounded-full ${active ? 'bg-[var(--customer-color-text-primary)]' : 'bg-[var(--customer-color-text-muted)]'}`}></span>
    </div>
  );
}

const emptyStageLabels = ['Pre-Approvals', 'Approvals', 'Construction', 'Activation'];

function StageMilestoneDots({
  visualState,
  completedCount,
  totalMilestones
}: {
  visualState: 'completed' | 'active' | 'pending';
  completedCount: number;
  totalMilestones: number;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length: totalMilestones }).map((_, index) => {
        if (index < completedCount) {
          return (
            <span
              key={index}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--customer-color-stage-complete)] text-white"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="m3.5 8 2.5 2.5 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          );
        }

        if (visualState === 'active' && index === completedCount) {
          return (
            <span
              key={index}
              className="h-6 w-6 rounded-full border-2 border-[rgba(33,33,32,0.55)] bg-transparent"
            ></span>
          );
        }

        if (visualState === 'active') {
          return (
            <span
              key={index}
              className="h-6 w-6 rounded-full bg-[var(--customer-color-text-primary)]"
            ></span>
          );
        }

        return (
          <span
            key={index}
            className="h-4 w-4 rounded-full bg-[var(--customer-color-border)]"
          ></span>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading, customerPortalView } = useAuth();
  const { projects, loading, error } = useProjects();
  const [projectSelection, setProjectSelection] = useState<{ scopeKey: string; projectId: string | null }>({
    scopeKey: '',
    projectId: null
  });

  const projectScopeKey =
    customerPortalView?.effectiveCustomerEmail?.trim().toLowerCase() ??
    user?.email?.trim().toLowerCase() ??
    '';

  useEffect(() => {
    analytics.pageView('dashboard');
  }, []);

  const selectedProjectId = useMemo(() => {
    if (!projects.length) {
      return null;
    }

    if (
      projectSelection.scopeKey === projectScopeKey &&
      projectSelection.projectId &&
      projects.some((project) => project.id === projectSelection.projectId)
    ) {
      return projectSelection.projectId;
    }

    return projects[0].id;
  }, [projectScopeKey, projectSelection, projects]);

  const selectedProject = useMemo(() => {
    if (!selectedProjectId) {
      return null;
    }

    return projects.find((project) => project.id === selectedProjectId) ?? null;
  }, [projects, selectedProjectId]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Not authenticated</h2>
          <Link 
            href="/login" 
            className="px-4 py-2 text-white rounded-md brand-button"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="customer-panel space-y-4 p-6 text-red-700">
        <p>{error}</p>
        {customerPortalView?.canImpersonate ? (
          <p className="text-sm text-[var(--customer-color-text-subtle)]">
            Use the <span className="font-semibold text-[var(--customer-color-text-primary)]">Internal</span> bar at the
            top of the page to search and open a customer account.
          </p>
        ) : null}
      </div>
    );
  }

  const selectedProjectStatus = selectedProject ? getProjectStatusSnapshot(selectedProject) : null;
  const selectedProjectStages = selectedProject ? getDashboardStageSections(selectedProject) : [];
  const isEmptyState = !loading && !selectedProject;

  const openAvaChat = () => {
    analytics.avaChatOpened('banner');
    const avaAuth = typeof window !== 'undefined' ? (window as Window & { AvaAuth?: { open: () => void } }).AvaAuth : undefined;
    if (avaAuth) {
      try {
        avaAuth.open();
      } catch (error) {
        console.error('Error opening Ava chat from dashboard panel:', error);
      }
    }
  };

  return (
    <div className="pb-8">
      {loading ? (
        <LoadingSpinner size="large" className="py-12" />
      ) : (
        <div className="grid gap-[var(--customer-layout-grid-gap)] lg:grid-cols-3">
          <section
            key={`properties-${selectedProject?.id ?? 'none'}`}
            className="customer-panel customer-panel-soft min-h-[620px] overflow-hidden xl:min-h-[931px]"
          >
            <div className="border-b border-[var(--customer-color-border-muted)] p-[var(--customer-space-panel-padding)]">
              <h2 className="text-[length:var(--customer-font-h7)] font-bold text-[var(--customer-color-text-primary)]">
                Properties
              </h2>
            </div>

            {isEmptyState ? (
              <div className="flex h-[calc(100%-62px)] flex-col items-center justify-center gap-3 px-8 text-center">
                <p className="text-[length:var(--customer-font-h5)] font-medium text-[var(--customer-color-text-muted)]">
                  No projects found
                </p>
                {customerPortalView?.canImpersonate ? (
                  <p className="max-w-sm text-sm text-[var(--customer-color-text-subtle)]">
                    Use the <span className="font-semibold">Internal</span> bar at the top of the page to search, then
                    pick a customer to load their properties here.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col">
                {projects.map((project) => {
                  const projectStatus = getProjectStatusSnapshot(project);
                  const isSelected = project.id === selectedProject?.id;
                  const isComplete =
                    projectStatus.currentStage.name.toLowerCase() === 'completed' ||
                    projectStatus.currentStage.status === 'completed';
                  const progressWidth = `${Math.max(projectStatus.progressPercentage, isComplete ? 100 : 14)}%`;

                  return (
                    <button
                      key={project.id}
                      type="button"
                      onClick={() => {
                        setProjectSelection({ scopeKey: projectScopeKey, projectId: project.id });
                        analytics.projectView(project.id);
                      }}
                      className={`grid min-h-[163px] grid-cols-[120px_minmax(0,1fr)] border-b border-[var(--customer-color-border-muted)] text-left transition-colors ${
                        isSelected
                          ? 'bg-[var(--customer-gradient-selected-row)] shadow-[inset_-4px_0_0_0_var(--customer-color-action)]'
                          : 'bg-transparent hover:bg-[rgba(110,185,254,0.04)]'
                      }`}
                    >
                      <div className="relative h-full overflow-hidden">
                        <img
                          src={getProjectHomePhotoUrl(project)}
                          alt={project.address}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src = 'https://via.placeholder.com/600x300?text=House+Image';
                          }}
                        />
                      </div>

                      <div className="flex min-w-0 flex-col justify-center px-5 py-6">
                        <h3 className="truncate text-[length:var(--customer-font-h6)] font-extrabold tracking-[-0.03em] text-[var(--customer-color-text-primary)]">
                          {project.address}
                        </h3>

                        <div className="mt-4 flex flex-wrap items-center gap-2 text-[length:var(--customer-font-paragraph)] font-semibold text-[var(--customer-color-text-primary)]">
                          <span>{isComplete ? 'Completed' : 'Last Updated:'}</span>
                          <span className="font-normal text-[var(--customer-color-text-subtle)]">
                            {formatDate(project.updated_at)}
                          </span>
                        </div>

                        <div className="mt-5 h-2.5 rounded-full bg-[var(--customer-color-border-muted)]">
                          <div
                            className={`h-full rounded-full ${
                              isComplete
                                ? 'bg-[var(--customer-color-progress-track)]'
                                : 'bg-[var(--customer-color-progress)]'
                            }`}
                            style={{ width: progressWidth }}
                          ></div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section
            key={`stages-${selectedProject?.id ?? 'none'}`}
            className="customer-panel customer-panel-soft flex min-h-[620px] flex-col overflow-hidden xl:min-h-[931px]"
          >
            <div className="border-b border-[var(--customer-color-border-muted)] p-[var(--customer-space-panel-padding)]">
              <h2 className="text-[length:var(--customer-font-h7)] font-bold text-[var(--customer-color-text-primary)]">
                Stages
              </h2>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {isEmptyState
                ? emptyStageLabels.map((label, index) => (
                    <div
                      key={label}
                      className={`relative flex min-h-[170px] flex-1 basis-0 flex-col items-center justify-center px-8 py-8 text-center ${
                        index < emptyStageLabels.length - 1
                          ? 'border-b border-[var(--customer-color-border-muted)]'
                          : ''
                      }`}
                    >
                      <StageMenuDots />
                      <h3 className="text-[length:var(--customer-font-h5)] font-medium tracking-[-0.03em] text-[var(--customer-color-text-muted)]">
                        {label}
                      </h3>
                      <p className="mt-4 text-[length:var(--customer-font-paragraph)] font-medium text-[var(--customer-color-text-muted)]">
                        No Project
                      </p>
                    </div>
                  ))
                : selectedProjectStages.map((section, index) => (
                    <div
                      key={section.key}
                      className={`relative flex min-h-[170px] flex-1 basis-0 flex-col items-center justify-center px-8 py-8 text-center ${
                        index < selectedProjectStages.length - 1
                          ? 'border-b border-[var(--customer-color-border-muted)]'
                          : ''
                      } ${section.visualState === 'active' ? '' : 'bg-transparent'}`}
                      style={
                        section.visualState === 'active'
                          ? { background: 'var(--customer-gradient-stage-active)' }
                          : undefined
                      }
                    >
                      <StageMenuDots active={section.visualState === 'active'} />
                      <h3
                        className={`${
                          section.visualState === 'active'
                            ? 'text-[length:var(--customer-font-h6)] leading-[1.5] tracking-[0]'
                            : 'text-[length:var(--customer-font-h5)] tracking-[-0.03em]'
                        } font-extrabold ${
                          section.visualState === 'active'
                            ? 'text-[var(--customer-color-text-primary)]'
                            : 'text-[var(--customer-color-text-muted)]'
                        }`}
                      >
                        {section.label}
                      </h3>
                      <div className="mt-6">
                        <StageMilestoneDots
                          visualState={section.visualState}
                          completedCount={section.completedCount}
                          totalMilestones={section.totalMilestones}
                        />
                      </div>
                    </div>
                  ))}
            </div>
          </section>

          <div className="flex min-h-[620px] flex-col gap-[var(--customer-layout-grid-gap)] xl:min-h-[931px]">
            <section
              key={`milestone-${selectedProject?.id ?? 'none'}`}
              className="customer-panel customer-panel-soft flex min-h-[300px] flex-col overflow-hidden xl:min-h-[300px]"
            >
              <div className="border-b border-[var(--customer-color-border-muted)] p-[var(--customer-space-panel-padding)]">
                <h2 className="text-[length:var(--customer-font-h7)] font-bold text-[var(--customer-color-text-primary)]">
                  Next Milestone
                </h2>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center p-[var(--customer-space-panel-padding)]">
                {isEmptyState || !selectedProjectStatus ? (
                  <h5 className="max-w-sm text-balance text-[length:var(--customer-font-h5)] font-[var(--customer-font-weight-regular)] leading-[var(--customer-line-height-regular)] tracking-[var(--customer-letter-spacing-h5)] text-[var(--customer-color-text-muted)]">
                    No more milestones
                  </h5>
                ) : (
                  <>
                    <h5 className="max-w-sm text-balance text-[length:var(--customer-font-h5)] font-[var(--customer-font-weight-heading)] leading-[var(--customer-line-height-h5)] tracking-[var(--customer-letter-spacing-h5)] text-[var(--customer-color-text-primary)]">
                      {getNextMilestoneDisplayName(selectedProjectStatus.nextMilestone)}
                    </h5>
                    <p className="mt-6 max-w-md text-center text-base leading-7 text-[var(--customer-color-text-primary)]">
                      {getNextMilestoneDescription(selectedProjectStatus.nextMilestone)}
                    </p>
                  </>
                )}
              </div>
            </section>

            <button
              type="button"
              onClick={openAvaChat}
              className="customer-panel flex min-h-[300px] flex-1 flex-col p-[var(--customer-space-panel-padding)] text-center"
              style={{ background: 'var(--customer-gradient-ava-panel)' }}
            >
              <h2 className="text-left text-[length:var(--customer-font-h7)] font-bold text-[var(--customer-color-text-primary)]">
                Ava
              </h2>
              <div className="flex flex-1 flex-col items-center justify-center">
                <h3 className="text-[length:var(--customer-font-h5)] font-extrabold tracking-[-0.05em] text-[var(--customer-color-text-primary)]">
                  Got questions?
                </h3>
                <p className="mt-6 max-w-sm text-base leading-7 text-[var(--customer-color-text-primary)]">
                  Ask me anything about your project. I bet I have an answer.
                </p>
                <span className="mt-10 flex h-[70px] w-[70px] items-center justify-center rounded-full bg-white/60 shadow-[0_18px_48px_rgba(111,99,255,0.16)]">
                  <img src="/ava-icon.svg" alt="Ava" className="h-10 w-10" />
                </span>
              </div>
            </button>
          </div>
        </div>
      )}

      {selectedProject && (
        <div className="mt-6 flex justify-end">
          <Link
            href={`/dashboard/${selectedProject.id}`}
            className="brand-button inline-flex items-center gap-2 px-5 py-3 text-sm"
          >
            <span>Open project details</span>
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}
