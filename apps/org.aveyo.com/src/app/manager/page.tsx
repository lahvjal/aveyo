"use client";

import ManagerPanel from "@/screens/ManagerPanel";
import { ProtectedLayoutPage } from "@/app/_components/protected-layout-page";

export default function ManagerPage() {
  return (
    <ProtectedLayoutPage>
      <ManagerPanel />
    </ProtectedLayoutPage>
  );
}
