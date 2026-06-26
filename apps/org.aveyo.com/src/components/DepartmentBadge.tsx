import { useMemo } from 'react'
import { useDepartments, formatDepartmentPath } from '../lib/queries'
import type { Department } from '../types'
import { Badge } from './ui/badge'
import { cn } from '../lib/utils'

interface DepartmentBadgeProps {
  department: Pick<Department, 'id' | 'name' | 'color'>
  className?: string
}

export function DepartmentBadge({ department, className }: DepartmentBadgeProps) {
  const { data: departments } = useDepartments()

  const label = useMemo(() => {
    if (!departments) return department.name
    return formatDepartmentPath(department.id, departments) || department.name
  }, [departments, department])

  return (
    <Badge
      className={cn('max-w-full truncate', className)}
      style={{ backgroundColor: department.color, color: 'white' }}
      title={label}
    >
      {label}
    </Badge>
  )
}
