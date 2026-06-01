"use client";

import Image, { type ImageProps } from "next/image";
import { useMemo } from "react";
import { useResolvedSitePhoto } from "@/components/site/site-photo-editor-provider";

type EditableSiteImageProps = Omit<ImageProps, "src"> & {
  src: string;
  photoSlot?: string;
  cropAspect?: number;
  editPlacement?: "top-right" | "bottom-left";
};

function editButtonClassName(placement: "top-right" | "bottom-left") {
  if (placement === "bottom-left") {
    return "absolute bottom-3 left-3 z-[30] flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-[#0A1628]/85 text-white shadow-lg backdrop-blur transition hover:bg-[#0A1628]";
  }
  return "absolute right-3 top-3 z-[30] flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-[#0A1628]/85 text-white shadow-lg backdrop-blur transition hover:bg-[#0A1628]";
}

function EditPhotoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="m13.5 6.5 3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function EditableSiteImage({
  src,
  photoSlot,
  cropAspect,
  editPlacement = "top-right",
  className,
  alt,
  ...imageProps
}: EditableSiteImageProps) {
  const { slotKey, resolvedSrc, canEdit, openSitePhotoEditor } = useResolvedSitePhoto(src, photoSlot);

  const editButtonLabel = useMemo(() => {
    const label = typeof alt === "string" && alt.trim() ? alt.trim() : "site photo";
    return `Edit ${label}`;
  }, [alt]);

  return (
    <div className="relative h-full w-full">
      <Image {...imageProps} src={resolvedSrc} alt={alt} className={className} />

      {canEdit && openSitePhotoEditor ? (
        <button
          type="button"
          aria-label={editButtonLabel}
          title={editButtonLabel}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openSitePhotoEditor({
              slotKey,
              defaultSrc: src,
              currentSrc: resolvedSrc,
              cropAspect
            });
          }}
          className={editButtonClassName(editPlacement)}
        >
          <EditPhotoIcon />
        </button>
      ) : null}
    </div>
  );
}
