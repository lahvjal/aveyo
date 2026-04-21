import type { CSSProperties } from "react";

import designSystem from "../../../aveyo.com/design-system.json";

const { colors, fontSize, spacing, radius, effects, layout, typography } = designSystem.tokens;

/** Internal admin preview strip — tokens aligned with apps/aveyo.com/design-system.json */
const internalBar = {
  "--customer-internal-bar-bg": colors.blueTint,
  "--customer-internal-bar-strip": colors.footerAvaAccent,
  "--customer-internal-bar-divider": colors.borderSoft,
  "--customer-internal-bar-badge-bg": colors.navy,
  "--customer-internal-bar-badge-fg": colors.white,
  "--customer-internal-bar-title": colors.black,
  "--customer-internal-bar-body": colors.grayDark4,
  "--customer-internal-bar-input-bg": colors.white,
  "--customer-internal-bar-input-border": colors.borderSoftAlt,
  "--customer-internal-bar-input-focus": colors.customerActionBlue,
  "--customer-space-btn-horiz": `${spacing.buttonHorizontal}px`,
  "--customer-space-btn-vert": `${spacing.buttonVertical}px`,
  "--customer-radius-field": `${radius.field}px`,
  "--customer-color-surface-muted": colors.grayLight4
} as const;

export const customerPortalStyleVars = {
  "--customer-color-canvas": colors.customerCanvasBg,
  "--customer-color-surface": colors.customerSurface,
  "--customer-color-border": colors.customerBorder,
  "--customer-color-border-muted": colors.customerBorderMuted,
  "--customer-color-text-primary": colors.black,
  "--customer-color-text-muted": colors.customerTextMuted,
  "--customer-color-text-subtle": colors.customerTextSubtle,
  "--customer-color-nav-muted": colors.customerNavMuted,
  "--customer-color-action": colors.customerActionBlue,
  "--customer-color-action-hover": colors.customerActionBlueHover,
  "--customer-color-progress": colors.customerProgressGreen,
  "--customer-color-progress-track": colors.customerProgressTrack,
  "--customer-color-stage-complete": colors.customerStageComplete,
  "--customer-font-h3": `${fontSize.h3}px`,
  "--customer-font-h4": `${fontSize.h4}px`,
  "--customer-font-h5": `${fontSize.h5}px`,
  /** 24px display heading — matches `typography.headingH4Mobile` (same size as token `fontSize.h5`) */
  "--customer-line-height-h5": String(typography.headingH4Mobile.lineHeight),
  "--customer-letter-spacing-h5": `${typography.headingH4Mobile.letterSpacing}px`,
  "--customer-font-weight-heading": String(typography.headingH4Mobile.weight),
  "--customer-font-weight-regular": String(typography.textRegularNormal.weight),
  "--customer-line-height-regular": String(typography.textRegularNormal.lineHeight),
  "--customer-font-h6": `${fontSize.h6}px`,
  "--customer-font-h7": `${fontSize.h7}px`,
  "--customer-font-paragraph": `${fontSize.paragraph}px`,
  "--customer-radius-button": `${radius.button}px`,
  "--customer-radius-card": `${radius.card}px`,
  "--customer-space-card-padding": `${spacing.cardPadding}px`,
  // "--customer-space-card-padding-small": `${spacing.customerPanelPadding}px`,
  "--customer-space-shell-gutter": `${spacing.customerShellGutter}px`,
  "--customer-space-panel-padding": `${spacing.customerPanelPadding}px`,
  "--customer-space-sidebar-padding": `${spacing.customerSidebarPadding}px`,
  "--customer-layout-sidebar-width": `${layout.customerSidebarWidth}px`,
  "--customer-layout-topbar-height": `${layout.customerTopbarHeight}px`,
  "--customer-layout-content-max": `${layout.customerContentMaxWidth}px`,
  "--customer-layout-grid-gap": `${layout.customerGridGap}px`,
  "--customer-shadow-panel": effects.customerPanelShadow,
  "--customer-gradient-page": "radial-gradient(circle at top right, rgba(110, 185, 254, 0.12) 0%, rgba(110, 185, 254, 0) 28%), var(--customer-color-canvas)",
  "--customer-gradient-stage-active": `linear-gradient(180deg, ${colors.footerSkyTop} 0%, ${colors.footerSkyMid} 58%, ${colors.footerSkyBottom} 100%)`,
  "--customer-gradient-ava-panel": "linear-gradient(180deg, rgba(244, 250, 255, 0.9) 0%, rgba(236, 230, 251, 0.95) 100%)",
  "--customer-gradient-selected-row": "linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 250, 255, 0.98) 100%)",
  ...internalBar
} as CSSProperties;
