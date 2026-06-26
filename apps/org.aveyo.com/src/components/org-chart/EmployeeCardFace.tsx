import type { HTMLAttributes } from 'react'
import type { OrgChartProfile } from '../../types'
import { DepartmentBadge } from '../DepartmentBadge'
import { getInitials, cn } from '../../lib/utils'
import { Mail } from 'lucide-react'

interface EmployeeCardFaceProps extends HTMLAttributes<HTMLDivElement> {
  profile: OrgChartProfile
  size?: 'chart' | 'flash'
  obscurePhoto?: boolean
  obscureText?: boolean
  blackoutPhoto?: boolean
}

const sizeStyles = {
  chart: {
    card: 'w-[220px] min-h-[240px]',
    photo: 'h-[150px]',
    initials: 'text-4xl',
    content: 'p-3',
    title: 'text-sm',
    subtitle: 'text-xs',
    badge: 'text-xs mb-2',
    emailRow: 'text-xs',
    emailIcon: 'h-3 w-3',
  },
  flash: {
    card: 'w-[320px] min-h-[360px]',
    photo: 'h-[220px]',
    initials: 'text-5xl',
    content: 'p-4',
    title: 'text-xl',
    subtitle: 'text-sm',
    badge: 'text-sm mb-3',
    emailRow: 'text-sm',
    emailIcon: 'h-4 w-4',
  },
} as const

export function EmployeeCardFace({
  profile,
  size = 'chart',
  className,
  obscurePhoto = false,
  obscureText = false,
  blackoutPhoto = false,
  ...props
}: EmployeeCardFaceProps) {
  const styles = sizeStyles[size]

  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-lg border-2 border-gray-200 hover:border-primary transition-colors overflow-hidden',
        styles.card,
        className,
      )}
      {...props}
    >
      <div className={cn('relative w-full bg-gray-100 flex-shrink-0 overflow-hidden', styles.photo, obscurePhoto && 'blur-sm')}>
        {profile.profile_photo_url ? (
          <img
            src={profile.profile_photo_url}
            alt={profile.full_name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className={cn('w-full h-full flex items-center justify-center bg-gray-200 text-gray-500 font-semibold', styles.initials)}>
            {getInitials(profile.full_name)}
          </div>
        )}
        {blackoutPhoto && <div className="absolute inset-0 bg-black/95" aria-hidden="true" />}
      </div>

      <div className={cn(styles.content, obscureText && 'blur-sm')}>
        <h3 className={cn('font-semibold truncate', styles.title)}>{profile.full_name}</h3>
        <p className={cn('text-muted-foreground truncate', styles.subtitle, size === 'flash' ? 'mb-3' : 'mb-2')}>
          {profile.job_title}
        </p>

        {profile.department && (
          <DepartmentBadge department={profile.department} className={styles.badge} />
        )}

        {profile.email && (
          <div className={cn('flex items-center gap-2 text-muted-foreground', styles.emailRow)}>
            <Mail className={cn('flex-shrink-0', styles.emailIcon)} />
            <span className="truncate">{profile.email}</span>
          </div>
        )}
      </div>
    </div>
  )
}
