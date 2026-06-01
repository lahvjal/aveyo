"use client";

import { useEffect, useRef, useState } from "react";
import { ModalOverlay } from "@/components/site/modal-overlay";
import { formatFileSize } from "@/lib/imageCompression";
import {
  resetMarketingSitePhoto,
  uploadMarketingSitePhoto,
  type MarketingSitePhotoRecord
} from "@/lib/marketing/site-photos";

const MAX_VIDEO_UPLOAD_BYTES = 40 * 1024 * 1024;

interface SiteVideoEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotKey: string;
  defaultSrc: string;
  currentSrc: string;
  label?: string;
  onSaved: (record: MarketingSitePhotoRecord | null) => void;
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SiteVideoEditModal({
  open,
  onOpenChange,
  slotKey,
  defaultSrc,
  currentSrc,
  label = "site video",
  onSaved
}: SiteVideoEditModalProps) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setError("");
    }
  }, [open]);

  const handleClose = () => {
    if (uploading || resetting) {
      return;
    }
    onOpenChange(false);
  };

  const handleUploadNew = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm)$/i.test(file.name)) {
      setError("Please select a video file (mp4, webm, or mov).");
      return;
    }

    if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
      setError(`Video must be less than ${formatFileSize(MAX_VIDEO_UPLOAD_BYTES)}.`);
      return;
    }

    setError("");
    setUploading(true);

    try {
      const record = await uploadMarketingSitePhoto({
        slotKey,
        defaultSrc,
        file
      });
      onSaved(record);
      onOpenChange(false);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload video.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleReset = async () => {
    setError("");
    setResetting(true);
    try {
      await resetMarketingSitePhoto(slotKey);
      onSaved(null);
      onOpenChange(false);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Failed to reset video.");
    } finally {
      setResetting(false);
    }
  };

  const isBusy = uploading || resetting;

  return (
    <ModalOverlay
      open={open}
      onClose={handleClose}
      labelledBy="site-video-edit-title"
      describedBy="site-video-edit-description"
      closeOnBackdrop={!isBusy}
    >
      <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(10,22,40,0.35)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#e5e7eb] px-6 py-5">
          <div>
            <h2 id="site-video-edit-title" className="text-lg font-bold text-[#0A1628]">
              Edit Site Video
            </h2>
            <p id="site-video-edit-description" className="mt-1 text-sm text-[#5f646b]">
              Replace this looping clip with a new mp4, webm, or mov file up to 40MB.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isBusy}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#5f646b] transition hover:bg-[#f4f6f6] disabled:opacity-60"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="relative mx-6 mt-6 aspect-[16/10] overflow-hidden rounded-xl bg-[#09111f]">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            key={currentSrc}
            src={currentSrc}
            muted
            loop
            playsInline
            autoPlay
            preload="metadata"
            className="h-full w-full object-cover"
            aria-label={`Preview of ${label}`}
          />
        </div>

        <div className="space-y-3 px-6 py-5">
          <button
            type="button"
            onClick={handleUploadNew}
            disabled={isBusy}
            className="flex w-full items-center justify-center rounded-full bg-[#0A1628] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
          >
            Upload New Video
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isBusy || currentSrc === defaultSrc}
            className="flex w-full items-center justify-center rounded-full border border-[#f1c7c7] px-5 py-3 text-sm font-semibold text-[#b42318] transition hover:bg-[#fff5f5] disabled:opacity-60"
          >
            Reset to Original
          </button>

          {uploading ? <p className="text-sm text-[#5f646b]">Uploading video...</p> : null}
          {resetting ? <p className="text-sm text-[#5f646b]">Resetting...</p> : null}
          {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
        className="hidden"
        onChange={handleFileChange}
        disabled={isBusy}
      />
    </ModalOverlay>
  );
}
