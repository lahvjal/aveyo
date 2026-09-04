"use client";

import OperationsManage from "@/screens/OperationsManage";
import { ProtectedLayoutPage } from "@/app/_components/protected-layout-page";

export default function OperationsManagePage() {
  return (
    <ProtectedLayoutPage>
      <OperationsManage />
    </ProtectedLayoutPage>
  );
}
