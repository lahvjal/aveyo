"use client";

import Processes from "@/screens/Processes";
import { ProtectedLayoutPage } from "@/app/_components/protected-layout-page";

export default function ProcessesPage() {
  return (
    <ProtectedLayoutPage>
      <Processes />
    </ProtectedLayoutPage>
  );
}
