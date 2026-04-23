import Image from "next/image";
import type { Metadata } from "next";
import { SiteHero, SitePageShell } from "@/components/site/page-kit";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import { customerReviews, type CustomerReview } from "@/lib/customer-reviews";

type ReviewGalleryItem = {
  review: CustomerReview;
  posterSrc: string;
  posterAlt: string;
  videoUrl?: string;
};

// Add a hosted mp4 URL to any card below to turn that poster into a playable review video.
const reviewGalleryItems: ReviewGalleryItem[] = [
  {
    review: customerReviews[0],
    posterSrc: "/images/web_photos/WhySolar_01_Hero-Solar-Home-Exterior_Drone.jpg",
    posterAlt: "Solar-ready home exterior captured from above at golden hour",
    videoUrl: "https://vz-bd3d2939-ded.b-cdn.net/399086ce-1515-4c0c-badd-dfa22ab8cb15/play_1080p.mp4"
  },
  {
    review: customerReviews[1],
    posterSrc: "/images/web_photos/WhySolar_01_Hero-Solar-Home-Exterior_Drone3.jpg",
    posterAlt: "Residential rooftop with solar panels and mountain backdrop",
    videoUrl: "https://vz-bd3d2939-ded.b-cdn.net/18fc8f21-19be-48db-9e3b-1e8d6b7b20de/play_1080p.mp4"
  },
  {
    review: customerReviews[4],
    posterSrc: "/images/web_photos/WhySolar_02_System-Design-CloseUp.jpg",
    posterAlt: "Close-up view of a residential solar panel array in daylight",
    videoUrl: "https://vz-bd3d2939-ded.b-cdn.net/d097274c-2e52-4a79-98d3-9dc18cc40f4c/play_1080p.mp4"
  },
  {
    review: customerReviews[6],
    posterSrc: "/images/web_photos/WhySolar_02_System-Design-CloseUp_ALT3.jpg",
    posterAlt: "Detailed rooftop solar installation photographed from the side",
    videoUrl: "https://vz-bd3d2939-ded.b-cdn.net/a17b7c1f-6936-4d2e-b037-09caa3444032/play_1080p.mp4"
  },
  {
    review: customerReviews[8],
    posterSrc: "/images/web_photos/roofsolarinstall.png",
    posterAlt: "Aveyo installation crew working together on a rooftop solar project",
    videoUrl: "https://vz-bd3d2939-ded.b-cdn.net/c5ac87d9-cf9f-40b7-9222-bd9f85899417/play_1080p.mp4"
  },
  {
    review: customerReviews[9],
    posterSrc: "/images/web_photos/WhySolar_02_System-Design-CloseUp_ALT4.jpg",
    posterAlt: "Residential solar panels shown in warm afternoon light",
    videoUrl: "https://vz-bd3d2939-ded.b-cdn.net/399086ce-1515-4c0c-badd-dfa22ab8cb15/play_1080p.mp4"
  }
];

const publishedVideoCount = reviewGalleryItems.filter((item) => item.videoUrl).length;

export const metadata: Metadata = {
  title: "Reviews | Aveyo",
  description:
    "Browse real homeowner stories, review highlights, and customer video testimonials from Aveyo installations."
};

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: rating }).map((_, index) => (
        <svg
          key={index}
          className="h-4 w-4 text-[#f5b400]"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function ReviewMedia({ item }: { item: ReviewGalleryItem }) {
  if (item.videoUrl) {
    return (
      <div className="relative aspect-[4/5] overflow-hidden bg-[#09111f]">
        <div className="absolute left-5 top-5 z-[3] rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
          Video Review
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          controls
          playsInline
          preload="metadata"
          poster={item.posterSrc}
          className="h-full w-full object-cover"
        >
          <source src={item.videoUrl} type="video/mp4" />
        </video>
      </div>
    );
  }

  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-[#09111f]">
      <Image
        src={item.posterSrc}
        alt={item.posterAlt}
        fill
        className="object-cover"
        sizes="(min-width: 1280px) 28vw, (min-width: 768px) 50vw, 100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#09111f]/90 via-[#09111f]/35 to-[#09111f]/10" />
      <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
        Review Highlight
      </div>
      <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#09111f] shadow-[0_14px_32px_rgba(0,0,0,0.24)]">
          <svg className="ml-0.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6 4.5A1.5 1.5 0 0 1 8.289 3.22l7.2 4.5a1.5 1.5 0 0 1 0 2.56l-7.2 4.5A1.5 1.5 0 0 1 6 13.5v-9Z" />
          </svg>
        </div>
        <p className="text-sm font-semibold leading-[1.45] text-white/88">
          This review is ready for a customer clip as soon as the video is published.
        </p>
      </div>
    </div>
  );
}

function ReviewVideoCard({ item }: { item: ReviewGalleryItem }) {
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-[var(--site-radius-corner)] bg-white shadow-[0_24px_70px_rgba(10,22,40,0.08)]">
      <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
      <div className="relative z-[2]">
        <ReviewMedia item={item} />
      </div>
    </article>
  );
}

export default function ReviewsPage() {
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
        description="Browse the stories behind the switch to solar, with room for every review highlight to become a full customer video testimonial."
        actions={[
          { href: "#review-gallery", label: "Browse Reviews", variant: "light" },
          { href: "/contact#sales-form", label: "Talk To Sales", variant: "outline" }
        ]}
        backgroundSrc="/images/web_photos/WhySolar_01_Hero-Solar-Home-Exterior_Drone3.jpg"
        backgroundAlt="Solar home exterior with mountains in the distance"
      />

      <section
        id="review-gallery"
        className="scroll-mt-32 bg-white bg-[color:var(--site-white)] text-[color:var(--site-black)]"
      >
        <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
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
              {publishedVideoCount > 0
                ? "Watch customer review videos and read the highlights that matter most before you start your own solar project."
                : "Customer video clips are still being published, so the gallery starts with the same homeowner highlights already earning Aveyo strong Google reviews."}
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {reviewGalleryItems.map((item) => (
              <ReviewVideoCard key={item.review.name} item={item} />
            ))}
          </div>
        </div>
      </section>
    </SitePageShell>
  );
}
