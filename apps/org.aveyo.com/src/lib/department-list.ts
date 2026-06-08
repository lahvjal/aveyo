import type { Department } from '../types'
import { buildDepartmentTree } from './queries'

export interface FlatDepartmentNode {
  department: Department
  depth: number
  parentName: string | null
}

export function buildFlatDepartmentList(departments: Department[]): FlatDepartmentNode[] {
  const tree = buildDepartmentTree(departments)
  const result: FlatDepartmentNode[] = []

  const walk = (node: Department, depth: number, parentName: string | null) => {
    result.push({
      department: node,
      depth,
      parentName,
    })

    for (const child of node.children ?? []) {
      walk(child, depth + 1, node.name)
    }
  }

  for (const root of tree) {
    walk(root, 0, null)
  }

  return result
}
