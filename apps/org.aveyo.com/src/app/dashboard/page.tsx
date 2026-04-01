"use client";

import Dashboard from "@/screens/Dashboard";
import { ProtectedLayoutPage } from "@/app/_components/protected-layout-page";

export default function DashboardPage() {
  return (
    <ProtectedLayoutPage>
      <Dashboard />
    </ProtectedLayoutPage>
  );
}
