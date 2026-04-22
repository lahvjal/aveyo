import { CardGradientBorder } from "@/components/ui/card-gradient-border";

type CarouselIndicatorsProps = {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  getAriaLabel?: (index: number) => string;
  className?: string;
  isPlaying?: boolean;
  autoplayDurationMs?: number;
  onTogglePlayback?: () => void;
  playLabel?: string;
  pauseLabel?: string;
};

const pillBackground =
  "linear-gradient(90deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.08) 100%), linear-gradient(90deg, rgba(76, 76, 76, 0.18) 0%, rgba(115, 115, 115, 0.18) 49.519%, rgba(78, 78, 78, 0.18) 100%)";

const getButtonLabel = (index: number) => `Go to slide ${index + 1}`;

function PauseIcon() {
  return (
    <svg aria-hidden="true" width="14" height="18" viewBox="0 0 14 18" fill="none">
      <rect x="1" y="1" width="4" height="16" rx="2" fill="currentColor" />
      <rect x="9" y="1" width="4" height="16" rx="2" fill="currentColor" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" width="15" height="18" viewBox="0 0 15 18" fill="none">
      <path d="M2 1.5L13 9L2 16.5V1.5Z" fill="currentColor" />
    </svg>
  );
}

function GlassSurface({ roundedClassName = "rounded-full" }: { roundedClassName?: string }) {
  return (
    <>
      <div
        className={`pointer-events-none absolute inset-0 z-0 ${roundedClassName}`.trim()}
        style={{
          backdropFilter: "blur(17px)",
          WebkitBackdropFilter: "blur(17px)",
          backgroundColor: "rgba(255, 255, 255, 0.02)",
          transform: "translateZ(0)",
        }}
      />
      <div
        className={`pointer-events-none absolute inset-0 z-0 ${roundedClassName}`.trim()}
        style={{ background: pillBackground }}
      />
      <div
        className={`pointer-events-none absolute inset-0 z-0 opacity-[0.06] mix-blend-overlay ${roundedClassName}`.trim()}
        style={{
          backgroundImage: "url('/images/04ace053e2cc3324a9bd79a136ce79eb15125e2d.png')",
          backgroundSize: "424px 424px",
        }}
      />
      <CardGradientBorder className={roundedClassName} />
    </>
  );
}

export function CarouselIndicators({
  count,
  activeIndex,
  onSelect,
  getAriaLabel = getButtonLabel,
  className = "",
  isPlaying = false,
  autoplayDurationMs = 5000,
  onTogglePlayback,
  playLabel = "Play carousel autoplay",
  pauseLabel = "Pause carousel autoplay",
}: CarouselIndicatorsProps) {
  return (
    <div className={`flex items-center justify-center gap-3 sm:gap-5 ${className}`.trim()}>
      {onTogglePlayback ? (
        <button
          type="button"
          onClick={onTogglePlayback}
          className="group relative inline-flex h-12 w-12 items-center justify-center overflow-hidden rounded-full text-white transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/10 sm:h-14 sm:w-[57px]"
          style={{
            backdropFilter: "blur(80px)",
            WebkitBackdropFilter: "blur(80px)",
          }}
          aria-label={isPlaying ? pauseLabel : playLabel}
        >
          <GlassSurface />
          <span className="relative z-10 flex items-center justify-center">
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </span>
        </button>
      ) : null}

      <div 
        className="relative flex items-center gap-3 overflow-hidden rounded-full px-5 py-4 sm:gap-4 sm:px-6 sm:py-5"
        style={{
          backdropFilter: "blur(80px)",
          WebkitBackdropFilter: "blur(80px)",
        }}
      >
        <GlassSurface />

        {Array.from({ length: count }, (_, index) => {
          const isActive = index === activeIndex;

          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(index)}
              className="relative z-10 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-black/10"
              aria-label={getAriaLabel(index)}
              aria-current={isActive ? "true" : undefined}
            >
              <div
                className={`relative overflow-hidden rounded-full transition-[width,background-color] duration-300 ease-out ${
                  isActive
                    ? "h-2 w-7 bg-white/20 sm:h-2.5 sm:w-[34px]"
                    : "h-2 w-2 bg-white/55 sm:h-2.5 sm:w-2.5"
                }`}
              >
                {isActive ? (
                  <span
                    className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-white/95"
                    style={{
                      animationName: "carousel-indicator-progress",
                      animationDuration: `${autoplayDurationMs}ms`,
                      animationTimingFunction: "linear",
                      animationFillMode: "both",
                      animationPlayState: isPlaying ? "running" : "paused",
                    }}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
