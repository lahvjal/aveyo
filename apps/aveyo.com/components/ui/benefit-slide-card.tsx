import { EditableSiteImage } from "@/components/site/editable-site-image";

export type BenefitSlideCardData = {
  title: string;
  description: string;
  alt: string;
  image?: string;
  backgroundColor?: string;
  hasDarkOverlay?: boolean;
};

type BenefitSlideCardProps = {
  slide: BenefitSlideCardData;
  width: number;
  height: number;
  isActive: boolean;
  onSelect: () => void;
};

export function BenefitSlideCard({
  slide,
  width,
  height,
  isActive,
  onSelect,
}: BenefitSlideCardProps) {
  return (
    <article
      onClick={onSelect}
      className={`relative flex-shrink-0 overflow-hidden rounded-[var(--home-card-radius)] ${
        !isActive ? "cursor-pointer" : ""
      }`}
      style={{ width, height }}
    >
      {slide.image ? (
        <EditableSiteImage
          src={slide.image}
          alt={slide.alt}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 84vw, (max-width: 1024px) 74vw, 885px"
          priority={isActive}
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: slide.backgroundColor ?? "#777777" }}
        />
      )}

      {slide.hasDarkOverlay ? <div className="absolute inset-0 bg-black/30" /> : null}

      <div className="absolute inset-0 flex items-end px-6 py-8 pb-10 text-white sm:px-10 sm:py-10 lg:px-[50px] lg:pt-[50px] lg:pb-[120px]">
        <div className="flex max-w-[469px] flex-col gap-5">
          <h3 className="text-[length:var(--home-h4-mobile)] leading-[1.4] sm:text-[28px] lg:text-[length:var(--home-h4)]">
            {slide.title}
          </h3>
          <p className="text-[15px] leading-[1.5] lg:text-[length:var(--home-h7)]">
            {slide.description}
          </p>
        </div>
      </div>
    </article>
  );
}
