/**
 * Image compression utility for marketing site photo uploads.
 */

export const SITE_PHOTO_MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

interface CompressionOptions {
  maxSizeMB: number;
  targetSizeMB: number;
  maxWidthOrHeight?: number;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {
    maxSizeMB: 2,
    targetSizeMB: 1.9,
    maxWidthOrHeight: 2048
  }
): Promise<File> {
  if (file.size <= options.maxSizeMB * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        try {
          compressLoadedImage(img, file, options).then(resolve).catch(reject);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error("Failed to load image"));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsDataURL(file);
  });
}

export async function compressImageForSiteUpload(file: File): Promise<File> {
  return compressImage(file, {
    maxSizeMB: 2,
    targetSizeMB: 1.9,
    maxWidthOrHeight: 2048
  });
}

async function compressLoadedImage(
  img: HTMLImageElement,
  originalFile: File,
  options: CompressionOptions
): Promise<File> {
  let { width, height } = img;
  const maxDimension = options.maxWidthOrHeight || 2048;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = (height / width) * maxDimension;
      width = maxDimension;
    } else {
      width = (width / height) * maxDimension;
      height = maxDimension;
    }
  }

  const fileSizeMB = originalFile.size / 1024 / 1024;
  const compressionRatio = options.targetSizeMB / fileSizeMB;
  let quality = Math.max(0.5, Math.min(0.92, compressionRatio * 1.1));

  for (let dimensionPass = 0; dimensionPass < 6; dimensionPass += 1) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const compressed = await attemptCompression(
      canvas,
      originalFile,
      quality,
      options.targetSizeMB
    );

    if (compressed.size <= SITE_PHOTO_MAX_UPLOAD_BYTES) {
      return compressed;
    }

    quality = 0.82;
    width *= 0.85;
    height *= 0.85;
  }

  throw new Error("Unable to compress image below 2MB. Try a smaller photo or crop tighter.");
}

function attemptCompression(
  canvas: HTMLCanvasElement,
  originalFile: File,
  quality: number,
  targetSizeMB: number,
  attempts = 0
): Promise<File> {
  const maxAttempts = 8;
  const outputType = "image/jpeg";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create blob from canvas"));
          return;
        }

        const blobSizeMB = blob.size / 1024 / 1024;
        const targetBytes = SITE_PHOTO_MAX_UPLOAD_BYTES;
        const tolerance = targetSizeMB * 0.08;

        if (
          blob.size <= targetBytes ||
          Math.abs(blobSizeMB - targetSizeMB) <= tolerance ||
          attempts >= maxAttempts
        ) {
          resolve(
            new File([blob], toJpegFileName(originalFile.name), {
              type: outputType,
              lastModified: Date.now()
            })
          );
          return;
        }

        const nextQuality =
          blobSizeMB > targetSizeMB ? Math.max(0.35, quality * 0.88) : Math.min(0.92, quality * 1.04);
        attemptCompression(canvas, originalFile, nextQuality, targetSizeMB, attempts + 1)
          .then(resolve)
          .catch(reject);
      },
      outputType,
      quality
    );
  });
}

function toJpegFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "").trim() || "site-photo";
  return `${baseName}.jpg`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}
