"use client";

import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";

type ViewportRevealElement =
  | "article"
  | "aside"
  | "div"
  | "footer"
  | "header"
  | "nav"
  | "p"
  | "section"
  | "span";

export interface ViewportRevealProps extends HTMLAttributes<HTMLElement> {
  as?: ViewportRevealElement;
  children: ReactNode;
  delayMs?: number;
  distance?: number;
  durationMs?: number;
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
}

function joinClassNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function ViewportReveal({
  as = "div",
  children,
  className,
  style,
  delayMs = 0,
  distance = 28,
  durationMs = 700,
  once = true,
  rootMargin = "0px 0px -12% 0px",
  threshold = 0.18,
  ...props
}: ViewportRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) {
          return;
        }

        if (entry.isIntersecting) {
          setIsVisible(true);

          if (once) {
            observer.unobserve(entry.target);
          }
          return;
        }

        if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [once, rootMargin, threshold]);

  const mergedStyle: CSSProperties = {
    "--viewport-reveal-delay": `${delayMs}ms`,
    "--viewport-reveal-distance": `${distance}px`,
    "--viewport-reveal-duration": `${durationMs}ms`,
    ...(style ?? {}),
  } as CSSProperties;

  return createElement(
    as,
    {
      ...props,
      ref: (node: HTMLElement | null) => {
        elementRef.current = node;
      },
      className: joinClassNames(
        "viewport-reveal",
        isVisible && "is-visible",
        className
      ),
      style: mergedStyle,
    },
    children
  );
}
