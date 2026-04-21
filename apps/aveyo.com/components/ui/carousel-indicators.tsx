import { CardGradientBorder } from "@/components/ui/card-gradient-border";

type CarouselIndicatorsProps = {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
  getAriaLabel?: (index: number) => string;
  className?: string;
};

const pillBackground =
  "linear-gradient(90deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.08) 100%), linear-gradient(90deg, rgba(76, 76, 76, 0.18) 0%, rgba(115, 115, 115, 0.18) 49.519%, rgba(78, 78, 78, 0.18) 100%)";

const getButtonLabel = (index: number) => `Go to slide ${index + 1}`;

export function CarouselIndicators({
  count,
  activeIndex,
  onSelect,
  getAriaLabel = getButtonLabel,
  className = "",
}: CarouselIndicatorsProps) {
  return (
    <div
      className={`relative flex items-center gap-[25px] overflow-hidden rounded-full px-[26px] py-[24px] backdrop-blur-[17px] ${className}`.trim()}
      style={{ background: pillBackground }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 rounded-full opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage: "url('/images/04ace053e2cc3324a9bd79a136ce79eb15125e2d.png')",
          backgroundSize: "424px 424px",
        }}
      />
      <CardGradientBorder className="rounded-full" />

      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          className="relative z-10 flex items-center justify-center"
          aria-label={getAriaLabel(index)}
          aria-current={index === activeIndex ? "true" : undefined}
        >
          <div
            className="h-2.5 rounded-full bg-white transition-all duration-300"
            style={{ width: index === activeIndex ? 34 : 10 }}
          />
        </button>
      ))}
    </div>
  );
}
