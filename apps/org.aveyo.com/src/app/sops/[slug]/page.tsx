"use client";

import { use } from "react";
import DepartmentSops from "@/screens/DepartmentSops";
import { ProtectedLayoutPage } from "@/app/_components/protected-layout-page";

export default function DepartmentSopsPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  return (
    <ProtectedLayoutPage>
      <DepartmentSops slug={slug} />
    </ProtectedLayoutPage>
  );
}
