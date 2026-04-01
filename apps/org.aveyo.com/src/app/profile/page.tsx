"use client";

import Profile from "@/screens/Profile";
import { ProtectedLayoutPage } from "@/app/_components/protected-layout-page";

export default function ProfilePage() {
  return (
    <ProtectedLayoutPage>
      <Profile />
    </ProtectedLayoutPage>
  );
}
