import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import type { OrgChartProfile } from '../../types'
import { EmployeeCardFace } from './EmployeeCardFace'

interface EmployeeNodeData {
  profile: OrgChartProfile
}

export const EmployeeNode = memo(({ data }: NodeProps<EmployeeNodeData>) => {
  const { profile } = data

  return (
    <div className="w-[220px]">
      <Handle type="target" position={Position.Top} className="!bg-primary" />
      <EmployeeCardFace profile={profile} />

      <Handle type="source" position={Position.Bottom} className="!bg-primary" />
    </div>
  )
})

EmployeeNode.displayName = 'EmployeeNode'
