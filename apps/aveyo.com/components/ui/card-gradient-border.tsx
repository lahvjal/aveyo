import type { CSSProperties } from "react";

import designSystem from "@/design-system.json";

const { cardGradientBorder } = designSystem.tokens.effects;

const cardGradientBorderStyle: CSSProperties = {
  padding: `${cardGradientBorder.width}px`,
  background: cardGradientBorder.background,
  WebkitMask: cardGradientBorder.webkitMask,
  WebkitMaskComposite: cardGradientBorder.webkitMaskComposite,
  maskComposite: cardGradientBorder.maskComposite as CSSProperties["maskComposite"]
};

export function CardGradientBorder({ className = "" }: { className?: string }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[1] ${className}`.trim()}
      aria-hidden="true"
      style={cardGradientBorderStyle}
    />
  );
}
