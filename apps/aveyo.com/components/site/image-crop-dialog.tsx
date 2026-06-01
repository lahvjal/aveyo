"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { ModalOverlay } from "@/components/site/modal-overlay";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  aspect?: number;
  onCropComplete: (croppedFile: File) => void;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}

async function getCroppedImageFile(imageSrc: string, pixelCrop: Area, fileName: string): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas is empty"));
          return;
        }

        resolve(
          new File([blob], fileName, {
            type: "image/jpeg",
            lastModified: Date.now()
          })
        );
      },
      "image/jpeg",
      0.95
    );
  });
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  aspect,
  onCropComplete
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropCompleteCallback = useCallback((_croppedArea: Area, nextCroppedAreaPixels: Area) => {
    setCroppedAreaPixels(nextCroppedAreaPixels);
  }, []);

  const handleClose = () => {
    if (processing) return;
    onOpenChange(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const handleSave = async () => {
    if (!croppedAreaPixels) return;

    setProcessing(true);
    try {
      const croppedFile = await getCroppedImageFile(
        imageSrc,
        croppedAreaPixels,
        `cropped-${Date.now()}.jpg`
      );
      onCropComplete(croppedFile);
      onOpenChange(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    } catch (error) {
      console.error("Error cropping image:", error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ModalOverlay
      open={open}
      onClose={handleClose}
      labelledBy="site-photo-crop-title"
      describedBy="site-photo-crop-description"
      closeOnBackdrop={!processing}
    >
      <div className="mx-auto w-full max-w-[680px] overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(10,22,40,0.35)]">
        <div className="border-b border-[#e5e7eb] px-6 py-5">
          <h2 id="site-photo-crop-title" className="text-lg font-bold text-[#0A1628]">
            Crop Photo
          </h2>
          <p id="site-photo-crop-description" className="mt-1 text-sm text-[#5f646b]">
            Adjust the crop area and zoom before saving this site photo.
          </p>
        </div>

        <div className="relative h-[min(60vh,420px)] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropCompleteCallback}
            cropShape="rect"
            showGrid={false}
          />
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#0A1628]" htmlFor="site-photo-crop-zoom">
              Zoom
            </label>
            <input
              id="site-photo-crop-zoom"
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={processing}
              className="rounded-full border border-[#dbe2e8] px-5 py-2.5 text-sm font-semibold text-[#0A1628] transition hover:bg-[#f4f6f6] disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={processing || !croppedAreaPixels}
              className="rounded-full bg-[#0A1628] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {processing ? "Processing..." : "Save Cropped Photo"}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}
