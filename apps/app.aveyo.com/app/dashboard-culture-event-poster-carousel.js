"use client";

import { useEffect, useState } from "react";

const CAROUSEL_INTERVAL_MS = 5000;

export function DashboardCultureEventPosterCarousel({ posters, eventTitle = "Culture event" }) {
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
    <div className="dashboard-culture-event-carousel" aria-label={`${eventTitle} posters`}>
      <div className="dashboard-culture-event-carousel-track" aria-hidden="true">
        {posters.map((poster, index) => (
          <div
            key={poster.id}
            className={`dashboard-culture-event-carousel-slide${
              index === activeIndex ? " is-active" : ""
            }`}
          >
            {poster.kind === "video" ? (
              index === activeIndex ? (
                <video
                  className="dashboard-culture-event-media"
                  src={poster.url}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : null
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="dashboard-culture-event-media"
                src={poster.url}
                alt={`${eventTitle} poster`}
              />
            )}
          </div>
        ))}
      </div>

      {slideCount > 1 ? (
        <div className="dashboard-culture-event-carousel-dots" aria-hidden="true">
          {posters.map((poster, index) => (
            <span
              key={poster.id}
              className={`dashboard-culture-event-carousel-dot${
                index === activeIndex ? " is-active" : ""
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
