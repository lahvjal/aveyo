/**
 * Image compression utility for marketing site photo uploads.
 */

interface CompressionOptions {
  maxSizeMB: number;
  targetSizeMB: number;
  maxWidthOrHeight?: number;
}

export async function compressImage(
  file: File,
  options: CompressionOptions = {
    maxSizeMB: 2.5,
    targetSizeMB: 2,
    maxWidthOrHeight: 2048
  }
): Promise<File> {
  const fileSizeMB = file.size / 1024 / 1024;

  if (fileSizeMB <= options.maxSizeMB) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        try {
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

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          const compressionRatio = options.targetSizeMB / fileSizeMB;
          const quality = Math.max(0.5, Math.min(0.95, compressionRatio * 1.2));
          attemptCompression(canvas, file, quality, options.targetSizeMB, resolve, reject);
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

function attemptCompression(
  canvas: HTMLCanvasElement,
  originalFile: File,
  quality: number,
  targetSizeMB: number,
  resolve: (file: File) => void,
  reject: (error: Error) => void,
  attempts = 0
): void {
  const maxAttempts = 5;

  canvas.toBlob(
    (blob) => {
      if (!blob) {
        reject(new Error("Failed to create blob from canvas"));
        return;
      }

      const blobSizeMB = blob.size / 1024 / 1024;
      const tolerance = targetSizeMB * 0.1;

      if (
        Math.abs(blobSizeMB - targetSizeMB) <= tolerance ||
        attempts >= maxAttempts ||
        blobSizeMB <= targetSizeMB
      ) {
        resolve(
          new File([blob], originalFile.name, {
            type: blob.type,
            lastModified: Date.now()
          })
        );
        return;
      }

      const nextQuality =
        blobSizeMB > targetSizeMB ? Math.max(0.1, quality * 0.9) : Math.min(0.95, quality * 1.05);
      attemptCompression(canvas, originalFile, nextQuality, targetSizeMB, resolve, reject, attempts + 1);
    },
    originalFile.type === "image/png" ? "image/png" : "image/jpeg",
    quality
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}
