"use client";

import { useEffect } from "react";
import { getPlatformAppUrl, getPostLoginRedirectUrl } from "@/lib/auth/config";

export default function OnboardingPage() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onboardingUrl = new URL("/onboarding", getPlatformAppUrl());
    onboardingUrl.searchParams.set(
      "returnTo",
      getPostLoginRedirectUrl()
    );
    window.location.replace(onboardingUrl.toString());
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center text-muted-foreground">
      Redirecting to employee onboarding...
    </main>
  );
}
