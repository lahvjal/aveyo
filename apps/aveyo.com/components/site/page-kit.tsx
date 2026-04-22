import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer, { type FooterCtaConfig } from "@/components/Footer";
import { SiteButtonLink } from "@/components/site/site-button-link";
import { CardGradientBorder } from "@/components/ui/card-gradient-border";
import { sitePageStyleVars } from "@/lib/site-page-design-system";

type SiteSectionTone = "light" | "cream" | "navy";

function getToneClasses(tone: SiteSectionTone) {
  switch (tone) {
    case "cream":
      return "bg-[#f5f3ee] bg-[color:var(--site-cream)] text-[#212120] text-[color:var(--site-black)]";
    case "navy":
      return "bg-[#0A1628] bg-[color:var(--site-navy)] text-white text-[color:var(--site-white)]";
    case "light":
    default:
      return "bg-white bg-[color:var(--site-white)] text-[#212120] text-[color:var(--site-black)]";
  }
}

function getMutedCopyClasses(tone: SiteSectionTone) {
  switch (tone) {
    case "navy":
      return "text-white/72";
    default:
      return "text-[#5f646b] text-[color:var(--site-text-muted)]";
  }
}

function getEyebrowClasses(tone: SiteSectionTone | "hero") {
  switch (tone) {
    case "hero":
    case "navy":
      return "text-white/60";
    default:
      return "text-[#6b7280] text-[color:var(--site-text-muted-alt)]";
  }
}

export interface SitePageCtaConfig extends FooterCtaConfig {}

export interface SiteHeroAction {
  href: string;
  label: string;
  variant?: "dark" | "light" | "outline" | "ghost";
  target?: string;
}

export function SitePageShell({
  children,
  cta,
  style
}: {
  children: ReactNode;
  cta?: SitePageCtaConfig;
  style?: CSSProperties;
}) {
  return (
    <main
      className="bg-[#f4f6f6] bg-[color:var(--site-page-shell-bg)]"
      style={style ? { ...sitePageStyleVars, ...style } : sitePageStyleVars}
    >
      <Navbar />
      {children}
      <Footer cta={cta} />
    </main>
  );
}

export function SiteHero({
  eyebrow,
  title,
  description,
  actions = [],
  imageSrc,
  imageAlt,
  backgroundSrc,
  backgroundAlt,
  visual,
  spotlight = "radial-gradient(circle at top right, rgba(255, 255, 255, 0.08), transparent 45%)",
  children
}: {
  eyebrow?: string;
  title: ReactNode;
  description: ReactNode;
  actions?: SiteHeroAction[];
  imageSrc?: string;
  imageAlt?: string;
  backgroundSrc?: string;
  backgroundAlt?: string;
  visual?: ReactNode;
  spotlight?: string;
  children?: ReactNode;
}) {
  const hasBgImage = !!backgroundSrc;
  const hasRightColumn = !hasBgImage && (!!visual || !!imageSrc);

  return (
    <section className={`relative overflow-hidden text-white text-[color:var(--site-white)] ${hasBgImage ? "min-h-[80vh]" : "bg-[#0A1628] bg-[color:var(--site-navy)]"}`}>
      {hasBgImage ? (
        <>
          <div className="absolute inset-0 z-0 bg-[#212120]">
            <Image
              src={backgroundSrc}
              alt={backgroundAlt ?? ""}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          </div>
          <div
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.4) 55%, rgba(0,0,0,0.2) 100%)" }}
          />
        </>
      ) : (
        <>
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "var(--site-hero-overlay, linear-gradient(135deg, rgba(0, 0, 0, 0.16) 0%, rgba(52, 66, 94, 0.18) 100%))"
            }}
          />
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay">
            <div
              className="h-full w-full"
              style={{
                backgroundImage: "url('/images/04ace053e2cc3324a9bd79a136ce79eb15125e2d.png')",
                backgroundSize: "424px 424px"
              }}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 opacity-80" style={{ background: spotlight }} />
        </>
      )}

      <div className={`relative z-[2] mx-auto max-w-[1240px] px-5 pb-20 pt-36 sm:px-6 md:pt-44 lg:px-8 lg:pb-24 ${hasRightColumn ? "grid gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end" : ""}`}>
        <div className="max-w-[760px]">
          {eyebrow ? (
            <p className={`mb-5 text-sm text-[length:var(--site-paragraph)] font-bold uppercase tracking-[0.32em] ${getEyebrowClasses("hero")}`}>
              {eyebrow}
            </p>
          ) : null}
          <h1
            className="text-[clamp(3rem,7vw,6.2rem)] leading-[0.94] tracking-[-0.03em]"
            style={{ fontSize: "clamp(3rem, 7vw, var(--site-h1))" }}
          >
            {title}
          </h1>
          <div className="mt-6 max-w-[620px] text-base text-[length:var(--site-body)] leading-[1.65] text-white/78 sm:text-lg sm:text-[length:var(--site-body-large)]">
            {description}
          </div>

          {actions.length > 0 ? (
            <div className="mt-8 flex flex-wrap gap-4">
              {actions.map((action) => (
                <SiteButtonLink
                  key={`${action.href}-${action.label}`}
                  href={action.href}
                  variant={action.variant ?? "light"}
                  target={action.target}
                >
                  {action.label}
                </SiteButtonLink>
              ))}
            </div>
          ) : null}

          {children ? <div className="mt-10">{children}</div> : null}
        </div>

        {visual ? (
          <div>{visual}</div>
        ) : imageSrc ? (
          <div className="relative min-h-[320px] overflow-hidden rounded-[var(--site-radius-corner)] bg-white/[0.05] shadow-[0_28px_80px_rgba(0,0,0,0.25)] backdrop-blur-[12px]">
            <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
            <Image
              src={imageSrc}
              alt={imageAlt ?? ""}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 36vw, 100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628]/30 via-transparent to-transparent" />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function SiteSection({
  eyebrow,
  title,
  description,
  tone = "light",
  align = "left",
  children
}: {
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  tone?: SiteSectionTone;
  align?: "left" | "center";
  children: ReactNode;
}) {
  const isCentered = align === "center";
  const toneClasses = getToneClasses(tone);
  const mutedCopyClasses = getMutedCopyClasses(tone);

  return (
    <section className={toneClasses}>
      <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
        {eyebrow || title || description ? (
          <div className={`mb-12 ${isCentered ? "mx-auto max-w-[760px] text-center" : "max-w-[720px]"}`}>
            {eyebrow ? (
              <p
                className={`mb-4 text-sm text-[length:var(--site-paragraph)] font-bold uppercase tracking-[0.32em] ${getEyebrowClasses(
                  tone
                )}`}
              >
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2
                className="text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.96] tracking-[-0.03em]"
                style={{ fontSize: "clamp(2.5rem, 5vw, var(--site-h2))" }}
              >
                {title}
              </h2>
            ) : null}
            {description ? (
              <div className={`mt-5 text-base text-[length:var(--site-body)] leading-[1.75] sm:text-lg sm:text-[length:var(--site-body-large)] ${mutedCopyClasses}`}>
                {description}
              </div>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export function SiteSplitSection({
  eyebrow,
  title,
  description,
  body,
  tone = "light",
  reverse = false,
  visual,
  footer
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  body?: ReactNode;
  tone?: SiteSectionTone;
  reverse?: boolean;
  visual: ReactNode;
  footer?: ReactNode;
}) {
  const toneClasses = getToneClasses(tone);
  const mutedCopyClasses = getMutedCopyClasses(tone);

  return (
    <section className={toneClasses}>
      <div className="mx-auto max-w-[1240px] px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div
          className={`grid gap-10 lg:grid-cols-2 lg:items-center ${
            reverse ? "lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1" : ""
          }`}
        >
          <div>
            {eyebrow ? (
              <p
                className={`mb-4 text-sm text-[length:var(--site-paragraph)] font-bold uppercase tracking-[0.32em] ${getEyebrowClasses(
                  tone
                )}`}
              >
                {eyebrow}
              </p>
            ) : null}
            <h2
              className="text-[clamp(2.4rem,5vw,4.3rem)] leading-[0.96] tracking-[-0.03em]"
              style={{ fontSize: "clamp(2.4rem, 5vw, var(--site-h2))" }}
            >
              {title}
            </h2>
            {description ? (
              <div className={`mt-5 text-base text-[length:var(--site-body)] leading-[1.65] sm:text-lg sm:text-[length:var(--site-body-large)] ${mutedCopyClasses}`}>
                {description}
              </div>
            ) : null}
            {body ? (
              <div className={`mt-8 space-y-4 text-base text-[length:var(--site-body)] leading-[1.8] ${mutedCopyClasses}`}>
                {body}
              </div>
            ) : null}
          </div>
          <div>{visual}</div>
        </div>
        {footer ? <div className="mt-12 lg:mt-16">{footer}</div> : null}
      </div>
    </section>
  );
}

export function SiteCardGrid({ children, columns = 3 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  const gridClassName =
    columns === 2
      ? "grid gap-5 md:grid-cols-2"
      : columns === 4
        ? "grid gap-5 md:grid-cols-2 xl:grid-cols-4"
        : "grid gap-5 md:grid-cols-2 xl:grid-cols-3";

  return <div className={gridClassName}>{children}</div>;
}

export function SiteCard({
  eyebrow,
  title,
  description,
  footer,
  tone = "light",
  imageSrc,
  imageAlt
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  tone?: "light" | "dark";
  imageSrc?: string;
  imageAlt?: string;
}) {
  const isDark = tone === "dark";
  const hasImage = !!imageSrc;

  return (
    <article
      className={`relative overflow-hidden rounded-[var(--site-radius-corner)] shadow-[0_22px_60px_rgba(10,22,40,0.08)] ${
        hasImage ? "" : "p-[var(--site-card-padding-comfortable)]"
      } ${
        isDark
          ? "border-white/10 bg-[#10223b] bg-[color:var(--site-navy-soft)] text-white text-[color:var(--site-white)]"
          : "border-[#dbe2e8] border-[color:var(--site-border-soft)] bg-gradient-to-b from-[#f9fbfc] from-[color:var(--site-surface-light-top)] to-[#eef3f7] to-[color:var(--site-surface-light-bottom)] text-[#212120] text-[color:var(--site-black)]"
      }`}
    >
      <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
      {hasImage ? (
        <div className="relative h-[200px] w-full shrink-0">
          <Image src={imageSrc} alt={imageAlt ?? ""} fill className="object-cover" sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" />
        </div>
      ) : null}
      <div className={`relative z-[2] ${hasImage ? "p-[var(--site-card-padding-comfortable)]" : ""}`}>
        {eyebrow ? (
          <p
            className={`mb-4 text-xs text-[length:var(--site-paragraph)] font-bold uppercase tracking-[0.28em] ${
              isDark ? "text-white/55" : "text-[#6b7280] text-[color:var(--site-text-muted-alt)]"
            }`}
          >
            {eyebrow}
          </p>
        ) : null}
        <h3 className="text-[length:var(--site-h5)] leading-[1.08] tracking-[-0.02em]">{title}</h3>
        {description ? (
          <div
            className={`mt-4 text-base text-[length:var(--site-body)] leading-[1.7] ${
              isDark ? "text-white/74" : "text-[#5f646b] text-[color:var(--site-text-muted)]"
            }`}
          >
            {description}
          </div>
        ) : null}
        {footer ? <div className="mt-6">{footer}</div> : null}
      </div>
    </article>
  );
}

export function SiteFaq({
  items,
  tone = "light"
}: {
  items: Array<{ question: string; answer: ReactNode }>;
  tone?: SiteSectionTone;
}) {
  const mutedCopyClasses = getMutedCopyClasses(tone);
  const toggleColorClass = tone === "navy" ? "text-white/60" : "text-[#6b7280] text-[color:var(--site-text-muted-alt)]";

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <details
          key={item.question}
          className="group relative overflow-hidden rounded-[var(--site-radius-corner)] bg-white/[0.03] px-[var(--site-card-padding-compact)] py-[var(--site-card-padding-tight)]"
        >
          <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
          <summary className="relative z-[2] flex cursor-pointer list-none items-center justify-between gap-4 text-[length:var(--site-body-large)] font-bold">
            <span>{item.question}</span>
            <span className={`${toggleColorClass} transition-transform group-open:rotate-45`}>+</span>
          </summary>
          <div className={`relative z-[2] mt-4 text-base leading-[1.75] ${mutedCopyClasses}`}>{item.answer}</div>
        </details>
      ))}
    </div>
  );
}

export function SiteImagePlaceholder({
  alt,
  className = ""
}: {
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-[#e8eef4] to-[#d4dce6] ${className}`}
      role="img"
      aria-label={alt}
      data-placeholder={alt}
    >
      <div className="flex flex-col items-center gap-3 px-6 text-center">
        <svg className="h-10 w-10 text-[#a3b1c2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" />
          <circle cx="8.5" cy="8.5" r="1.5" strokeWidth="1.5" />
          <path d="m21 15-5-5L5 21" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="max-w-[280px] text-sm font-medium text-[#8896a7]">{alt}</p>
      </div>
    </div>
  );
}

export function SiteImageRow({
  images,
  className = ""
}: {
  images: Array<{ src?: string; alt: string; objectPosition?: CSSProperties["objectPosition"] }>;
  className?: string;
}) {
  const isSplit = images.length >= 2;

  return (
    <div className={`grid gap-5 ${isSplit ? "lg:grid-cols-2" : ""}${className ? ` ${className}` : ""}`}>
      {images.map((image) => (
        <div
          key={image.alt}
          className="relative h-[400px] overflow-hidden rounded-[var(--site-radius-corner)] lg:h-[545px]"
        >
          {image.src ? (
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover"
              style={image.objectPosition ? { objectPosition: image.objectPosition } : undefined}
              sizes={isSplit ? "(min-width: 1024px) 50vw, 100vw" : "100vw"}
            />
          ) : (
            <SiteImagePlaceholder alt={image.alt} className="h-full w-full" />
          )}
        </div>
      ))}
    </div>
  );
}

export function SiteImageBreak({
  images
}: {
  images: Array<{ src?: string; alt: string; objectPosition?: CSSProperties["objectPosition"] }>;
}) {
  return (
    <section className="bg-white bg-[color:var(--site-white)] pb-[100px]">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-6 lg:px-8">
        <SiteImageRow images={images} />
      </div>
    </section>
  );
}

export function SiteArticleCard({
  category,
  title,
  href,
  publishedLabel,
  imageSrc,
  imageAlt
}: {
  category?: string;
  title: string;
  href: string;
  publishedLabel?: string;
  imageSrc?: string;
  imageAlt?: string;
}) {
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-[var(--site-radius-corner)] bg-white shadow-[0_20px_60px_rgba(10,22,40,0.08)]">
      <CardGradientBorder className="rounded-[var(--site-radius-corner)]" />
      {imageSrc ? (
        <div className="relative h-[200px] w-full shrink-0">
          <Image src={imageSrc} alt={imageAlt ?? ""} fill className="object-cover" sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw" />
        </div>
      ) : null}
      <div className="relative z-[2] flex h-full flex-col p-[var(--site-card-padding-compact)]">
        <div className="flex flex-wrap items-center gap-3">
          {category ? (
            <span className="rounded-full bg-[#edf4fb] bg-[color:var(--site-gray-light-4)] px-3 py-1 text-[length:var(--site-paragraph)] font-bold uppercase tracking-[0.18em] text-[#0A1628] text-[color:var(--site-black)]">
              {category}
            </span>
          ) : null}
          {publishedLabel ? (
            <span className="text-[length:var(--site-paragraph)] text-[#6b7280] text-[color:var(--site-text-muted-alt)]">
              {publishedLabel}
            </span>
          ) : null}
        </div>
        <h3 className="mt-5 text-[length:var(--site-h4)] leading-[1.1] tracking-[-0.02em] text-[#212120] text-[color:var(--site-black)]">
          {title}
        </h3>
        <div className="mt-6">
          <SiteButtonLink href={href} variant="ghost" className="text-[length:var(--site-body)]">
            Read Article
          </SiteButtonLink>
        </div>
      </div>
    </article>
  );
}
