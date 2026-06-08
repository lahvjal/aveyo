"use client";

import SopsIndex from "@/screens/SopsIndex";
import { ProtectedLayoutPage } from "@/app/_components/protected-layout-page";

export default function SopsPage() {
  return (
    <ProtectedLayoutPage>
      <SopsIndex />
    </ProtectedLayoutPage>
  );
}
