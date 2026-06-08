import Link from "next/link";
import { ArrowRight, ClipboardList, GitFork } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";
import { Card, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

const operationSections = [
  {
    title: "Processes",
    description: "Build and view flowcharts for your team's processes.",
    href: "/processes",
    icon: GitFork
  },
  {
    title: "SOPs",
    description: "Standard operating procedures for day-to-day operations.",
    href: "/sops",
    icon: ClipboardList
  }
] as const;

export default function Operations() {
  usePageTitle("Operations");

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-2">Operations</h1>
      <p className="text-muted-foreground mb-8">
        Process documentation and standard operating procedures for your team.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {operationSections.map((section) => {
          const Icon = section.icon;

          return (
            <Link key={section.href} href={section.href} className="group block">
              <Card className="h-full transition-colors hover:border-primary/40 hover:bg-accent/30">
                <CardHeader className="gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="rounded-md border bg-background p-2 text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <ArrowRight
                      className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="space-y-2">
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
