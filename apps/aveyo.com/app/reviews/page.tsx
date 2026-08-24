import type { Metadata } from "next";
import { SiteHero, SitePageShell } from "@/components/site/page-kit";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import { getPublicReviewVideos, type PublicReviewVideo } from "@/lib/review-videos";
import { ReviewVideosRefreshButton } from "./review-videos-refresh-button";

export const metadata: Metadata = {
  title: "Reviews | Aveyo",
  description:
    "Watch real Aveyo customers share their solar installation and savings experiences."
};

function ReviewMedia({ video }: { video: PublicReviewVideo }) {
  return (
    <div className="relative aspect-video overflow-hidden bg-[#09111f]">
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0`}
        title={video.title}
        loading="lazy"
        className="absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}

function ReviewVideoCard({ video }: { video: PublicReviewVideo }) {
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-[var(--site-radius-corner)] bg-white shadow-[0_24px_70px_rgba(10,22,40,0.08)]">
      <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
      <div className="relative z-[2]">
        <ReviewMedia video={video} />
      </div>
      <div className="relative z-[2] flex flex-1 items-center px-5 py-4">
        <h3 className="text-lg font-semibold leading-snug text-[color:var(--site-black)]">
          {video.title}
        </h3>
      </div>
    </article>
  );
}

export default async function ReviewsPage() {
  const reviewVideos = await getPublicReviewVideos();

  return (
    <SitePageShell
      cta={{
        eyebrow: "See What Solar Sounds Like",
        title: "Hear What Homeowners Are Saying.\nThen See What Your Home Could Save.",
        description:
          "When you are ready, our team can walk you through your options and build a plan around your roof, goals, and budget.",
        actionLabel: "Pick A Plan",
        actionHref: "/#pricing"
      }}
    >
      <SiteHero
        eyebrow="Customer Reviews"
        title={
          <>
            Real Homeowners.
            <br />
            Real Solar Stories.
          </>
        }
        description="Watch real Aveyo customers share what their solar experience has been like, from installation through everyday savings."
        actions={[
          { href: "/#pricing", label: "See Plans", variant: "light" },
          { href: "#review-gallery", label: "Browse Reviews", variant: "outline" }
        ]}
        backgroundSrc="/images/web_photos/reviewsHero.webp"
        backgroundAlt="Homeowner standing outside a solar-powered home in the backyard"
      />

      <section
        id="review-gallery"
        className="scroll-mt-32 bg-white bg-[color:var(--site-white)] text-[color:var(--site-black)]"
      >
        <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[760px]">
              <p className="mb-4 text-sm font-bold uppercase tracking-[0.32em] text-[color:var(--site-text-muted-alt)]">
                Review Gallery
              </p>
              <h2
                className="text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.96] tracking-[-0.03em]"
                style={{ fontSize: "clamp(2.5rem, 5vw, var(--site-h2))" }}
              >
                Customer Stories, Ready To Watch
              </h2>
              <p className="mt-5 text-base leading-[1.75] text-[color:var(--site-text-muted)] sm:text-lg">
                {reviewVideos.length > 0
                  ? "Watch real Aveyo customers share their experience before you start your own solar project."
                  : "Customer video clips are still being published, so the gallery starts with the same homeowner highlights already earning Aveyo strong Google reviews."}
              </p>
            </div>
            <ReviewVideosRefreshButton />
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {reviewVideos.map((video) => (
              <ReviewVideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>
      </section>
    </SitePageShell>
  );
}
