import type { CSSProperties } from "react";

import designSystem from "@/design-system.json";

const { colors, fontSize, typography, spacing, radius } = designSystem.tokens;
const { testimonials } = designSystem.components;

export const homepageStyleVars = {
  "--home-black": colors.black,
  "--home-white": colors.white,
  "--home-foreground-primary": colors.foregroundPrimary,
  "--home-gray-dark-2": colors.grayDark2,
  "--home-gray-dark-4": colors.grayDark4,
  "--home-gray-light-4": colors.grayLight4,
  "--home-gray-light-5": colors.grayLight5,
  "--home-testimonial-star": testimonials.starColor,
  "--home-h1": `${fontSize.h1}px`,
  "--home-h2": `${fontSize.h2}px`,
  "--home-h3": `${fontSize.h3}px`,
  "--home-h4": `${fontSize.h4}px`,
  "--home-h4-mobile": `${typography.headingH4Mobile.size}px`,
  "--home-h5": `${fontSize.h5}px`,
  "--home-h6": `${fontSize.h6}px`,
  "--home-h7": `${fontSize.h7}px`,
  "--home-paragraph": `${fontSize.paragraph}px`,
  "--home-text-large": `${typography.textLargeNormal.size}px`,
  "--home-text-medium-extra-bold": `${typography.textMediumExtraBold.size}px`,
  "--home-card-padding": `${spacing.cardPadding}px`,
  "--home-button-px": `${spacing.buttonHorizontal}px`,
  "--home-button-py": `${spacing.buttonVertical}px`,
  "--home-button-radius": `${radius.button}px`,
  "--home-card-radius": `${radius.card}px`
} as CSSProperties;
