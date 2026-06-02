"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageCropDialog } from "@/components/site/image-crop-dialog";
import { ModalOverlay } from "@/components/site/modal-overlay";
import { compressImageForSiteUpload } from "@/lib/imageCompression";
import {
  resetMarketingSitePhoto,
  uploadMarketingSitePhoto,
  type MarketingSitePhotoRecord
} from "@/lib/marketing/site-photos";

interface SitePhotoEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slotKey: string;
  defaultSrc: string;
  currentSrc: string;
  aspect?: number;
  onSaved: (photo: MarketingSitePhotoRecord | null) => void;
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function SitePhotoEditModal({
  open,
  onOpenChange,
  slotKey,
  defaultSrc,
  currentSrc,
  aspect,
  onSaved
}: SitePhotoEditModalProps) {
  const [error, setError] = useState("");
  const [compressing, setCompressing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const cropObjectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearCropPreview = useCallback(() => {
    if (cropObjectUrlRef.current) {
      URL.revokeObjectURL(cropObjectUrlRef.current);
      cropObjectUrlRef.current = null;
    }
    setImageToCrop(null);
  }, []);

  useEffect(() => {
    if (!open) {
      setError("");
      setShowCropDialog(false);
      clearCropPreview();
    }
  }, [open, clearCropPreview]);

  const handleClose = () => {
    if (compressing || uploading || resetting) {
      return;
    }
    onOpenChange(false);
  };

  const handleUploadNew = () => {
    fileInputRef.current?.click();
  };

  const handleRecrop = () => {
    const separator = currentSrc.includes("?") ? "&" : "?";
    setImageToCrop(`${currentSrc}${separator}t=${Date.now()}`);
    setShowCropDialog(true);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setError("");
    clearCropPreview();
    const objectUrl = URL.createObjectURL(file);
    cropObjectUrlRef.current = objectUrl;
    setImageToCrop(objectUrl);
    setShowCropDialog(true);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadCroppedFile = async (croppedFile: File) => {
    setShowCropDialog(false);
    clearCropPreview();

    try {
      setCompressing(true);
      const fileToUpload = await compressImageForSiteUpload(croppedFile);
      setCompressing(false);

      setUploading(true);
      const photo = await uploadMarketingSitePhoto({
        slotKey,
        defaultSrc,
        file: fileToUpload
      });
      onSaved(photo);
      onOpenChange(false);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload photo.");
    } finally {
      setUploading(false);
      setCompressing(false);
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
      setError(resetError instanceof Error ? resetError.message : "Failed to reset photo.");
    } finally {
      setResetting(false);
    }
  };

  const isBusy = compressing || uploading || resetting;

  return (
    <>
      <ModalOverlay
        open={open && !showCropDialog}
        onClose={handleClose}
        labelledBy="site-photo-edit-title"
        describedBy="site-photo-edit-description"
        closeOnBackdrop={!isBusy}
      >
        <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(10,22,40,0.35)]">
          <div className="flex items-start justify-between gap-4 border-b border-[#e5e7eb] px-6 py-5">
            <div>
              <h2 id="site-photo-edit-title" className="text-lg font-bold text-[#0A1628]">
                Edit Site Photo
              </h2>
              <p id="site-photo-edit-description" className="mt-1 text-sm text-[#5f646b]">
                Replace or recrop this image. Any size is accepted and compressed under 2MB before upload.
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

          <div className="relative mx-6 mt-6 aspect-[16/10] overflow-hidden rounded-xl bg-[#eef3f7]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentSrc} alt="Current site photo preview" className="h-full w-full object-cover" />
          </div>

          <div className="space-y-3 px-6 py-5">
            <button
              type="button"
              onClick={handleUploadNew}
              disabled={isBusy}
              className="flex w-full items-center justify-center rounded-full bg-[#0A1628] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              Upload New Photo
            </button>
            <button
              type="button"
              onClick={handleRecrop}
              disabled={isBusy}
              className="flex w-full items-center justify-center rounded-full border border-[#dbe2e8] px-5 py-3 text-sm font-semibold text-[#0A1628] transition hover:bg-[#f4f6f6] disabled:opacity-60"
            >
              Crop Current Photo
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={isBusy || currentSrc === defaultSrc}
              className="flex w-full items-center justify-center rounded-full border border-[#f1c7c7] px-5 py-3 text-sm font-semibold text-[#b42318] transition hover:bg-[#fff5f5] disabled:opacity-60"
            >
              Reset to Original
            </button>

            {compressing ? <p className="text-sm text-[#5f646b]">Compressing image...</p> : null}
            {uploading ? <p className="text-sm text-[#5f646b]">Uploading...</p> : null}
            {resetting ? <p className="text-sm text-[#5f646b]">Resetting...</p> : null}
            {error ? <p className="text-sm text-[#b42318]">{error}</p> : null}
          </div>
        </div>
      </ModalOverlay>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={isBusy}
      />

      {imageToCrop ? (
        <ImageCropDialog
          open={showCropDialog}
          onOpenChange={(nextOpen) => {
            setShowCropDialog(nextOpen);
            if (!nextOpen) {
              clearCropPreview();
            }
          }}
          imageSrc={imageToCrop}
          aspect={aspect}
          onCropComplete={uploadCroppedFile}
        />
      ) : null}
    </>
  );
}
