"use client";

import { useState, type ChangeEvent } from "react";
import { formatFileSize } from "@/lib/imageCompression";
import { compressNewsImage, NEWS_IMAGE_ACCEPT } from "@/lib/news-image-compression";
import { uploadMarketingNewsImage, type MarketingNewsImage } from "@/lib/news";

interface NewsImageUploadProps {
  id: string;
  label: string;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onUploaded: (image: MarketingNewsImage) => void;
}

export default function NewsImageUpload({ id, label, disabled, onBusyChange, onUploaded }: NewsImageUploadProps) {
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || disabled) {
      return;
    }

    onBusyChange(true);
    setError("");
    setStatus("Compressing image…");
    try {
      const compressed = await compressNewsImage(file);
      setStatus("Uploading image…");
      const image = await uploadMarketingNewsImage(compressed);
      onUploaded(image);
      setStatus(`Uploaded ${file.name}: ${formatFileSize(file.size)} → ${formatFileSize(image.size)}.`);
    } catch (error) {
      setStatus("");
      setError(error instanceof Error ? error.message : "Unable to upload image. Please try again.");
    } finally {
      onBusyChange(false);
    }
  }

  return (
    <div className="news-image-upload">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="file" accept={NEWS_IMAGE_ACCEPT} disabled={disabled}
        onChange={handleFileChange} aria-describedby={`${id}-help ${id}-status`} />
      <p id={`${id}-help`} className="helper-text">
        JPG, PNG, WebP, or AVIF. Images are automatically compressed to 500 KB or smaller before upload.
      </p>
      <p id={`${id}-status`} className="helper-text" role="status">{status}</p>
      {error ? <div className="notice warning" role="alert">{error}</div> : null}
    </div>
  );
}
