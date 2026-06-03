"use client";

import { useEffect, useState } from "react";
import type { CultureEventPoster } from "@/lib/culture";
import styles from "./culture-page.module.css";

const CAROUSEL_INTERVAL_MS = 5000;

interface EventPosterCarouselProps {
  posters: CultureEventPoster[];
  imageClassName?: string;
  videoClassName?: string;
}

export function EventPosterCarousel({
  posters,
  imageClassName = styles.eventPosterMedia,
  videoClassName = styles.eventPosterVideo
}: EventPosterCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const slideCount = posters.length;

  useEffect(() => {
    setActiveIndex(0);
  }, [posters]);

  useEffect(() => {
    if (slideCount <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, CAROUSEL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [slideCount]);

  if (slideCount === 0) {
    return null;
  }

  return (
    <div className={styles.eventPosterCarousel}>
      <div className={styles.eventPosterCarouselTrack} aria-hidden="true">
        {posters.map((poster, index) => (
          <div
            key={poster.id}
            className={`${styles.eventPosterCarouselSlide} ${
              index === activeIndex ? styles.eventPosterCarouselSlideActive : ""
            }`}
          >
            {poster.kind === "video" ? (
              <video
                className={videoClassName}
                src={poster.url}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={imageClassName} src={poster.url} alt="" />
            )}
          </div>
        ))}
      </div>

      {slideCount > 1 ? (
        <div className={styles.eventPosterCarouselDots} aria-hidden="true">
          {posters.map((poster, index) => (
            <span
              key={poster.id}
              className={`${styles.eventPosterCarouselDot} ${
                index === activeIndex ? styles.eventPosterCarouselDotActive : ""
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
