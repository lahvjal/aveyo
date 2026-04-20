"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NewsPostEditor from "@/components/news-post-editor";
import { MarketingShell } from "@/components/marketing-shell";
import { useRequireAuth } from "@/lib/auth/use-require-auth";
import { createMarketingNewsPost, type MarketingNewsMutationInput } from "@/lib/news";
import { MARKETING_SECTION_TABS } from "@/lib/marketing-sections";

export default function CreateNewsPostPage() {
  const session = useRequireAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (session.loading || !session.authenticated) {
    return <main className="loading-shell">Checking session...</main>;
  }

  if (session.userType !== "employee") {
    return (
      <MarketingShell
        session={session}
        currentPath="/news/create"
        title="Create News Post"
        description="Employee-only publishing workspace."
        sectionTabs={MARKETING_SECTION_TABS}
      >
        <div className="access-denied">Employee access is required to create news posts.</div>
      </MarketingShell>
    );
  }

  async function handleSubmit(value: MarketingNewsMutationInput) {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const post = await createMarketingNewsPost(value);
      router.push(`/news/${post.id}?created=1`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create post.");
      setIsSaving(false);
    }
  }

  return (
    <MarketingShell
      session={session}
      currentPath="/news/create"
      title="Create News Post"
      description="Draft a new blog or news article for the public site."
      sectionTabs={MARKETING_SECTION_TABS}
    >
      <NewsPostEditor
        mode="create"
        canPublish={session.access.isAdmin}
        cancelHref="/news"
        isSaving={isSaving}
        errorMessage={errorMessage}
        onSubmit={handleSubmit}
      />
    </MarketingShell>
  );
}
