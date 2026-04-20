"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import NewsPostEditor from "@/components/news-post-editor";
import { MarketingShell } from "@/components/marketing-shell";
import { useRequireAuth } from "@/lib/auth/use-require-auth";
import { MARKETING_SECTION_TABS } from "@/lib/marketing-sections";
import {
  buildMarketingNewsPathname,
  deleteMarketingNewsPost,
  getMarketingNewsPost,
  updateMarketingNewsPost,
  type MarketingNewsMutationInput,
  type MarketingNewsPost
} from "@/lib/news";
import { buildAveyoSiteUrl } from "@/lib/public-site";

function EditNewsPostPageContent({ postId }: { postId: string }) {
  const session = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [post, setPost] = useState<MarketingNewsPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!session.authenticated || session.userType !== "employee") {
      return;
    }

    let cancelled = false;

    async function loadPost() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const payload = await getMarketingNewsPost(postId);
        if (cancelled) {
          return;
        }
        setPost(payload);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setPost(null);
        setErrorMessage(error instanceof Error ? error.message : "Unable to load post.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadPost();
    return () => {
      cancelled = true;
    };
  }, [postId, session.authenticated, session.userType]);

  const liveHref = useMemo(() => {
    if (!post?.publishedAt) {
      return null;
    }
    return buildAveyoSiteUrl(buildMarketingNewsPathname(post.slug));
  }, [post]);

  const statusMessage = useMemo(() => {
    if (searchParams.get("created") === "1") {
      return "Post created successfully.";
    }
    if (searchParams.get("saved") === "1") {
      return "Post saved successfully.";
    }
    return "";
  }, [searchParams]);

  if (session.loading || !session.authenticated) {
    return <main className="loading-shell">Checking session...</main>;
  }

  if (session.userType !== "employee") {
    return (
      <MarketingShell
        session={session}
        currentPath={`/news/${postId}`}
        title="Edit News Post"
        description="Employee-only publishing workspace."
        sectionTabs={MARKETING_SECTION_TABS}
      >
        <div className="access-denied">Employee access is required to edit news posts.</div>
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
      const updatedPost = await updateMarketingNewsPost(postId, value);
      setPost(updatedPost);
      setIsSaving(false);
      router.replace(`/news/${updatedPost.id}?saved=1`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save post.");
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!session.access.isAdmin || isDeleting || !post) {
      return;
    }

    if (!window.confirm(`Delete "${post.title}"?`)) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      await deleteMarketingNewsPost(postId);
      router.push("/news?deleted=1");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete post.");
      setIsDeleting(false);
    }
  }

  return (
    <MarketingShell
      session={session}
      currentPath={`/news/${postId}`}
      title="Edit News Post"
      description="Update the content, SEO fields, and publish status for this article."
      sectionTabs={MARKETING_SECTION_TABS}
    >
      {statusMessage ? <div className="notice success">{statusMessage}</div> : null}
      {isLoading ? <div className="card">Loading post...</div> : null}
      {!isLoading && !post ? (
        <div className="access-denied">This post could not be found or you no longer have access.</div>
      ) : null}
      {post ? (
        <NewsPostEditor
          mode="edit"
          initialPost={post}
          canPublish={session.access.isAdmin}
          cancelHref="/news"
          isSaving={isSaving}
          isDeleting={isDeleting}
          errorMessage={errorMessage}
          liveHref={liveHref}
          onSubmit={handleSubmit}
          onDelete={session.access.isAdmin ? handleDelete : undefined}
        />
      ) : null}
    </MarketingShell>
  );
}

function EditNewsPostPageWrapper({ postId }: { postId: string }) {
  return (
    <Suspense fallback={<main className="loading-shell">Loading editor...</main>}>
      <EditNewsPostPageContent postId={postId} />
    </Suspense>
  );
}

export default function EditNewsPostPage() {
  const params = useParams<{ postId: string }>();
  const postId = typeof params.postId === "string" ? params.postId : "";
  return <EditNewsPostPageWrapper postId={postId} />;
}
