import { describe, expect, it } from 'vitest'
import {
  canManageOperationsTabLinks,
  getOperationDriveFolderUrlError,
  getOperationTabDriveUrl,
  normalizeOperationDriveFolderUrl,
  type OperationTabLink,
  OPERATION_TAB_DEFINITIONS,
} from './operations-config'

describe('Operations link permissions', () => {
  const activeProfile = {
    employment_status: 'active' as const,
    onboarding_completed: true,
    department: { name: 'Operations' },
  }

  it.each([
    { ...activeProfile, is_admin: true },
    { ...activeProfile, is_super_admin: true },
    { ...activeProfile, is_manager: true },
  ])('allows an active admin or Operations Manager', (profile) => {
    expect(canManageOperationsTabLinks(profile)).toBe(true)
  })

  it.each([
    { ...activeProfile, is_process_editor: true },
    { ...activeProfile, is_manager: true, department: { name: 'Sales' } },
    { ...activeProfile },
    { ...activeProfile, is_manager: true, employment_status: 'terminated' as const },
    { ...activeProfile, is_manager: true, onboarding_completed: false },
  ])('denies Process Editors, generic managers, and inactive staff', (profile) => {
    expect(canManageOperationsTabLinks(profile)).toBe(false)
  })
})

describe('Operations Drive folder URL validation', () => {
  it('keeps Field Safety Protocol on its in-app library page', () => {
    expect(
      OPERATION_TAB_DEFINITIONS.find((definition) => definition.key === 'field_safety_protocol')
        ?.allowDriveOverride,
    ).toBe(false)
  })

  it.each([
    'https://drive.google.com/drive/folders/abc_123-XYZ',
    'https://drive.google.com/drive/u/0/folders/abc_123-XYZ?usp=sharing',
  ])('accepts Google Drive folder URLs: %s', (url) => {
    expect(getOperationDriveFolderUrlError(url)).toBeNull()
  })

  it.each([
    'http://drive.google.com/drive/folders/abc123',
    'https://docs.google.com/document/d/abc123/edit',
    'https://drive.google.com/file/d/abc123/view',
    'https://drive.google.com:444/drive/folders/abc123',
    'https://example.com/drive/folders/abc123',
    'not a URL',
  ])('rejects non-folder destinations: %s', (url) => {
    expect(getOperationDriveFolderUrlError(url)).toBe(
      'Enter an HTTPS Google Drive folder URL.',
    )
  })

  it('treats an empty value as the built-in fallback', () => {
    expect(normalizeOperationDriveFolderUrl('   ')).toBeNull()
  })

  it('normalizes a valid folder URL before saving', () => {
    expect(
      normalizeOperationDriveFolderUrl(
        ' https://drive.google.com/drive/folders/abc123?usp=sharing ',
      ),
    ).toBe('https://drive.google.com/drive/folders/abc123?usp=sharing')
  })

  it('ignores an invalid stored value and keeps the fallback available', () => {
    const links = [
      {
        tab_key: 'processes',
        drive_url: 'https://example.com/not-drive',
        updated_by: null,
        created_at: '2026-09-04T00:00:00.000Z',
        updated_at: '2026-09-04T00:00:00.000Z',
      },
    ] satisfies OperationTabLink[]

    expect(getOperationTabDriveUrl(links, 'processes')).toBeNull()
  })
})
