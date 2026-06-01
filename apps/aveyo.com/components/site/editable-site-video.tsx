"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type VideoHTMLAttributes
} from "react";
import { useResolvedSitePhoto } from "@/components/site/site-photo-editor-provider";

type EditableSiteVideoProps = Omit<VideoHTMLAttributes<HTMLVideoElement>, "src" | "children"> & {
  src: string;
  videoSlot?: string;
  label?: string;
  editPlacement?: "top-right" | "bottom-left";
};

function editButtonClassName(placement: "top-right" | "bottom-left") {
  if (placement === "bottom-left") {
    return "absolute bottom-3 left-3 z-[30] flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-[#0A1628]/85 text-white shadow-lg backdrop-blur transition hover:bg-[#0A1628]";
  }
  return "absolute right-3 top-3 z-[30] flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-[#0A1628]/85 text-white shadow-lg backdrop-blur transition hover:bg-[#0A1628]";
}

function EditVideoIcon() {
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

export const EditableSiteVideo = forwardRef<HTMLVideoElement, EditableSiteVideoProps>(
  function EditableSiteVideo(
    {
      src,
      videoSlot,
      label,
      editPlacement = "top-right",
      className,
      autoPlay,
      loop,
      muted,
      playsInline,
      poster,
      preload,
      onLoadedData,
      onLoadedMetadata,
      ...videoProps
    },
    ref
  ) {
    const internalRef = useRef<HTMLVideoElement>(null);
    const { slotKey, resolvedSrc, canEdit, openSiteVideoEditor } = useResolvedSitePhoto(src, videoSlot);

    useImperativeHandle(ref, () => internalRef.current as HTMLVideoElement);

    const editButtonLabel = useMemo(() => {
      const resolvedLabel = label?.trim() || "site video";
      return `Edit ${resolvedLabel}`;
    }, [label]);

    useEffect(() => {
      const video = internalRef.current;
      if (!video) {
        return;
      }

      video.load();
      if (autoPlay) {
        void video.play().catch(() => {});
      }
    }, [resolvedSrc, autoPlay]);

    return (
      <div className="relative h-full w-full">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          {...videoProps}
          ref={internalRef}
          src={resolvedSrc}
          className={className}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline={playsInline}
          poster={poster}
          preload={preload}
          onLoadedData={onLoadedData}
          onLoadedMetadata={onLoadedMetadata}
        />

        {canEdit && openSiteVideoEditor ? (
          <button
            type="button"
            aria-label={editButtonLabel}
            title={editButtonLabel}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openSiteVideoEditor({
                slotKey,
                defaultSrc: src,
                currentSrc: resolvedSrc,
                label: label ?? "site video"
              });
            }}
            className={editButtonClassName(editPlacement)}
          >
            <EditVideoIcon />
          </button>
        ) : null}
      </div>
    );
  }
);
