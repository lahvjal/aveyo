import designSystem from "../../aveyo.com/design-system.json";

const { colors, spacing, radius, typography } = designSystem.tokens;

const bodyText = typography.textRegularNormal;
const actionText = typography.textMediumExtraBold;

export const authStyleVars = {
  "--auth-color-canvas": colors.pageShellBg,
  "--auth-color-surface": colors.white,
  "--auth-color-surface-muted": colors.grayLight5,
  "--auth-color-border": colors.borderSoft,
  "--auth-color-border-strong": colors.borderSoftAlt,
  "--auth-color-text-primary": colors.black,
  "--auth-color-text-muted": colors.grayDark2,
  "--auth-color-text-subtle": colors.textMuted,
  "--auth-color-primary": colors.navy,
  "--auth-color-primary-hover": colors.navySoft,
  "--auth-color-accent": colors.customerActionBlue,
  "--auth-color-accent-soft": colors.blueTint,
  "--auth-space-button-x": `${spacing.buttonHorizontal}px`,
  "--auth-space-button-y": `${spacing.buttonVertical}px`,
  "--auth-radius-button": `${radius.button}px`,
  "--auth-radius-field": `${radius.field}px`,
  "--auth-font-body-size": `${bodyText.size}px`,
  "--auth-font-body-line-height": `${bodyText.lineHeight}`,
  "--auth-font-body-weight": `${bodyText.weight}`,
  "--auth-font-action-size": `${actionText.size}px`,
  "--auth-font-action-weight": `${actionText.weight}`,
  "--auth-shadow-focus": "0 0 0 4px rgba(110, 185, 254, 0.18)",
  "--auth-shadow-primary": "0 14px 32px rgba(10, 22, 40, 0.14)"
};
