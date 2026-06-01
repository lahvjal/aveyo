"use client";

import { EditableSiteImage } from "@/components/site/editable-site-image";

export function NewsArticleHeroImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative min-h-[320px] w-full">
      <EditableSiteImage src={src} alt={alt} fill className="object-cover" sizes="(min-width: 1024px) 36vw, 100vw" />
    </div>
  );
}
