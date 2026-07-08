"use client";

import EmployeeSurvey from "@/screens/EmployeeSurvey";
import { ProtectedLayoutPage } from "@/app/_components/protected-layout-page";

export default function SurveyPage() {
  return (
    <ProtectedLayoutPage>
      <EmployeeSurvey />
    </ProtectedLayoutPage>
  );
}
