import Link from "next/link";
import { ArrowRight, ClipboardList, ExternalLink, GitFork, Settings2, ShieldCheck } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { usePermissions } from "../hooks/usePermissions";
import { useOperationsTabLinks } from "../hooks/useOperationsTabLinks";
import {
  getOperationTabDriveUrl,
  OPERATION_TAB_DEFINITIONS,
  type OperationTabKey
} from "../lib/operations-config";
import { Card, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

const operationIcons: Record<OperationTabKey, typeof GitFork> = {
  processes: GitFork,
  sops: ClipboardList,
  field_safety_protocol: ShieldCheck
};

export default function Operations() {
  usePageTitle("Operations");
  const { canManageOperationsTabs } = usePermissions();
  const { data: tabLinks = [] } = useOperationsTabLinks({ enabled: canManageOperationsTabs });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Operations</h1>
          <p className="text-muted-foreground">
            Process documentation, standard operating procedures, and field safety resources for your team.
          </p>
        </div>
        {canManageOperationsTabs ? (
          <Link
            href="/operations/manage"
            className="inline-flex h-10 flex-shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background px-4 py-2 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Settings2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Manage links
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OPERATION_TAB_DEFINITIONS.map((section) => {
          const Icon = operationIcons[section.key];
          const driveUrl = section.allowDriveOverride
            ? getOperationTabDriveUrl(tabLinks, section.key)
            : null;
          const destination = driveUrl ?? section.fallbackHref;
          const card = (
            <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/30">
              <CardHeader className="gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-md border bg-background p-2 text-primary">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  {driveUrl ? (
                    <ExternalLink
                      className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground"
                      aria-hidden="true"
                    />
                  ) : (
                    <ArrowRight
                      className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                      aria-hidden="true"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                  {driveUrl ? (
                    <p className="text-xs font-medium text-primary">Google Drive folder</p>
                  ) : null}
                </div>
              </CardHeader>
            </Card>
          );

          return driveUrl ? (
            <a
              key={section.key}
              href={destination}
              target="_blank"
              rel="noopener noreferrer"
              className="group block"
            >
              {card}
            </a>
          ) : (
            <Link key={section.key} href={destination} className="group block">
              {card}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
