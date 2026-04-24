"use client";

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function CulturePencilIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12.916 4.584a1.667 1.667 0 1 1 2.357 2.357l-8.02 8.019-3.44.676.675-3.439 8.428-8.428Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="m11.875 5.625 2.5 2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function CultureTrashIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4.167 5h11.666"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="m7.083 5 .243-1.214A1.667 1.667 0 0 1 8.96 2.5h2.08a1.667 1.667 0 0 1 1.634 1.286L12.917 5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M6.25 7.5v6.667A1.667 1.667 0 0 0 7.917 15.833h4.166a1.667 1.667 0 0 0 1.667-1.666V7.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <path
        d="M8.75 9.583v3.75M11.25 9.583v3.75"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function CultureLocationIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M8 14s4.25-4.038 4.25-7.5A4.25 4.25 0 1 0 3.75 6.5C3.75 9.962 8 14 8 14Z"
        fill="currentColor"
      />
      <circle cx="8" cy="6.5" r="1.5" fill="white" />
    </svg>
  );
}

export function CultureCalendarIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M4.5 1.5v2M11.5 1.5v2M2.5 5.167h11M3.833 3.167h8.334c.736 0 1.333.597 1.333 1.333v7.667c0 .736-.597 1.333-1.333 1.333H3.833A1.333 1.333 0 0 1 2.5 12.167V4.5c0-.736.597-1.333 1.333-1.333ZM5.5 7.5h1.333v1.333H5.5zM8.833 7.5h1.334v1.333H8.833zM5.5 10.167h1.333V11.5H5.5zM8.833 10.167h1.334V11.5H8.833z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function CultureCloseIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="m5.833 5.833 8.334 8.334M14.167 5.833l-8.334 8.334"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
