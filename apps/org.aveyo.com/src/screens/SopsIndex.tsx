import Link from 'next/link'
import { ArrowLeft, ArrowRight, ClipboardList, Loader2 } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useDepartments } from '../lib/queries'
import { useDepartmentSopDocumentCounts } from '../hooks/useSops'
import { buildFlatDepartmentList } from '../lib/department-list'
import { Badge } from '../components/ui/badge'

export default function SopsIndex() {
  usePageTitle('SOPs')

  const { data: departments = [], isLoading: departmentsLoading } = useDepartments()
  const { data: documentCounts, isLoading: countsLoading } = useDepartmentSopDocumentCounts()

  const flatDepartments = buildFlatDepartmentList(departments)
  const isLoading = departmentsLoading || countsLoading

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Link
          href="/operations"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Operations
        </Link>
        <h1 className="text-3xl font-bold mb-2">SOPs</h1>
        <p className="text-muted-foreground">
          Browse standard operating procedures by department.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : flatDepartments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground gap-3">
          <ClipboardList className="h-12 w-12 opacity-30" />
          <p className="font-medium">No departments yet</p>
          <p className="text-sm">Departments will appear here once they are created in the org chart.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {flatDepartments.map(({ department, depth, parentName }) => {
            const slug = department.slug
            const documentCount = documentCounts?.get(department.id) ?? 0

            if (!slug) {
              return null
            }

            return (
              <Link
                key={department.id}
                href={`/sops/${slug}`}
                className="group flex items-center justify-between gap-4 rounded-lg border bg-white px-4 py-4 transition-colors hover:border-primary/40 hover:bg-accent/20"
                style={{ paddingLeft: `${depth * 20 + 16}px` }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: department.color }}
                      aria-hidden="true"
                    />
                    <h2 className="font-semibold truncate">{department.name}</h2>
                    {depth > 0 ? (
                      <Badge variant="outline" className="hidden sm:inline-flex">
                        Sub-department
                      </Badge>
                    ) : null}
                  </div>
                  {parentName ? (
                    <p className="mt-1 text-sm text-muted-foreground">Under {parentName}</p>
                  ) : null}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm text-muted-foreground">
                    {documentCount} {documentCount === 1 ? 'document' : 'documents'}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
