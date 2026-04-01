"use client";

import AdminPanel from "@/screens/AdminPanel";
import { ProtectedLayoutPage } from "@/app/_components/protected-layout-page";

export default function AdminPage() {
  return (
    <ProtectedLayoutPage>
      <AdminPanel />
    </ProtectedLayoutPage>
  );
}
