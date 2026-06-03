/**
 * Client-side image compression for culture event poster uploads.
 */

export const CULTURE_POSTER_IMAGE_MAX_BYTES = 1 * 1024 * 1024;

interface CompressionOptions {
  maxBytes: number;
  targetSizeMB: number;
  maxWidthOrHeight?: number;
}

export async function compressImageForCulturePosterUpload(file: File): Promise<File> {
  if (file.size <= CULTURE_POSTER_IMAGE_MAX_BYTES) {
    return file;
  }

  return compressImage(file, {
    maxBytes: CULTURE_POSTER_IMAGE_MAX_BYTES,
    targetSizeMB: 0.95,
    maxWidthOrHeight: 2048
  });
}

async function compressImage(file: File, options: CompressionOptions): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();

      img.onload = () => {
        compressLoadedImage(img, file, options).then(resolve).catch(reject);
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

async function compressLoadedImage(
  img: HTMLImageElement,
  originalFile: File,
  options: CompressionOptions
): Promise<File> {
  let { width, height } = img;
  const maxDimension = options.maxWidthOrHeight ?? 2048;

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
      options.targetSizeMB,
      options.maxBytes
    );

    if (compressed.size <= options.maxBytes) {
      return compressed;
    }

    quality = 0.82;
    width *= 0.85;
    height *= 0.85;
  }

  throw new Error("Unable to compress image below 1MB. Try a smaller image or fewer posters at once.");
}

function attemptCompression(
  canvas: HTMLCanvasElement,
  originalFile: File,
  quality: number,
  targetSizeMB: number,
  maxBytes: number,
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
        const tolerance = targetSizeMB * 0.08;

        if (
          blob.size <= maxBytes ||
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
        attemptCompression(canvas, originalFile, nextQuality, targetSizeMB, maxBytes, attempts + 1)
          .then(resolve)
          .catch(reject);
      },
      outputType,
      quality
    );
  });
}

function toJpegFileName(fileName: string) {
  const baseName = fileName.replace(/\.[^.]+$/, "").trim() || "culture-poster";
  return `${baseName}.jpg`;
}

export function formatFileSize(bytes: number) {
  if (bytes === 0) {
    return "0 Bytes";
  }

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}
