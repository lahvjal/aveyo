"use client";

import FieldSafetyProtocol from "@/screens/FieldSafetyProtocol";
import { ProtectedLayoutPage } from "@/app/_components/protected-layout-page";

export default function FieldSafetyProtocolPage() {
  return (
    <ProtectedLayoutPage>
      <FieldSafetyProtocol />
    </ProtectedLayoutPage>
  );
}
