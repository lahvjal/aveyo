import type { Department, Profile } from '../types'
import { getDepartmentDescendantIds } from './queries'

export function canManageDepartmentSops(
  profile: Pick<Profile, 'id' | 'department_id' | 'is_manager' | 'is_admin' | 'is_super_admin'> | null | undefined,
  departmentId: string,
  departments: Department[]
): boolean {
  if (!profile) {
    return false
  }

  if (profile.is_admin || profile.is_super_admin) {
    return true
  }

  if (!profile.is_manager || !profile.department_id) {
    return false
  }

  const manageableDepartmentIds = getDepartmentDescendantIds(profile.department_id, departments)
  return manageableDepartmentIds.includes(departmentId)
}
