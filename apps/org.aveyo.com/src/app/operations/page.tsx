"use client";

import Operations from "@/screens/Operations";
import { ProtectedLayoutPage } from "@/app/_components/protected-layout-page";

export default function OperationsPage() {
  return (
    <ProtectedLayoutPage>
      <Operations />
    </ProtectedLayoutPage>
  );
}
