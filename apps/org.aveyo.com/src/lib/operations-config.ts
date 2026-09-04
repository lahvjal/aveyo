export const OPERATION_TAB_KEYS = [
  'processes',
  'sops',
  'field_safety_protocol',
] as const

export type OperationTabKey = (typeof OPERATION_TAB_KEYS)[number]

export interface OperationTabLink {
  tab_key: OperationTabKey
  drive_url: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
}

export interface OperationTabDefinition {
  key: OperationTabKey
  title: string
  description: string
  fallbackHref: string
  fallbackDescription: string
  allowDriveOverride: boolean
}

export interface OperationsLinkPermissionProfile {
  is_admin?: boolean | null
  is_super_admin?: boolean | null
  is_manager?: boolean | null
  is_process_editor?: boolean | null
  onboarding_completed?: boolean | null
  employment_status?: 'active' | 'terminated' | null
  department?: { name?: string | null } | null
}

export function canManageOperationsTabLinks(
  profile: OperationsLinkPermissionProfile | null | undefined,
): boolean {
  if (
    !profile
    || (profile.employment_status ?? 'active') !== 'active'
    || profile.onboarding_completed !== true
  ) {
    return false
  }

  const isAdmin = Boolean(profile.is_admin || profile.is_super_admin)
  const isOperationsManager = Boolean(
    profile.is_manager
    && profile.department?.name?.trim().toLowerCase() === 'operations',
  )

  return isAdmin || isOperationsManager
}

export const OPERATION_TAB_DEFINITIONS: readonly OperationTabDefinition[] = [
  {
    key: 'processes',
    title: 'Processes',
    description: "Build and view flowcharts for your team's processes.",
    fallbackHref: '/processes',
    fallbackDescription: 'Uses the built-in process library when no Drive folder is set.',
    allowDriveOverride: true,
  },
  {
    key: 'sops',
    title: 'SOPs',
    description: 'Standard operating procedures for day-to-day operations.',
    fallbackHref: '/sops',
    fallbackDescription: 'Uses the department SOP browser when no Drive folder is set.',
    allowDriveOverride: true,
  },
  {
    key: 'field_safety_protocol',
    title: 'Field Safety Protocol',
    description: 'Current safety policies and guidance for work in the field.',
    fallbackHref: '/field-safety-protocol',
    fallbackDescription: 'Uses the in-app Field Safety library backed by Google Drive documents.',
    allowDriveOverride: false,
  },
] as const

const DRIVE_FOLDER_PATH = /^\/drive(?:\/u\/\d+)?\/folders\/[A-Za-z0-9_-]+\/?$/

export function getOperationDriveFolderUrlError(rawUrl: string): string | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.length > 2048) {
    return 'The folder URL must be 2,048 characters or fewer.'
  }

  try {
    const url = new URL(trimmed)
    if (
      url.protocol !== 'https:'
      || url.hostname !== 'drive.google.com'
      || url.username
      || url.password
      || url.port
      || !DRIVE_FOLDER_PATH.test(url.pathname)
    ) {
      return 'Enter an HTTPS Google Drive folder URL.'
    }
  } catch {
    return 'Enter an HTTPS Google Drive folder URL.'
  }

  return null
}

export function normalizeOperationDriveFolderUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim()
  const error = getOperationDriveFolderUrlError(trimmed)

  if (error) {
    throw new Error(error)
  }

  return trimmed ? new URL(trimmed).toString() : null
}

export function getOperationTabDriveUrl(
  links: readonly OperationTabLink[],
  tabKey: OperationTabKey,
): string | null {
  const driveUrl = links.find((link) => link.tab_key === tabKey)?.drive_url ?? null
  return driveUrl && !getOperationDriveFolderUrlError(driveUrl) ? driveUrl : null
}
