export const NEWS_IMAGE_MAX_BYTES = 500 * 1024;
export const NEWS_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

const SUPPORTED_TYPES = new Set(NEWS_IMAGE_ACCEPT.split(","));

function encodeCanvas(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Unable to compress this image. Try another file.")),
      "image/webp",
      quality
    );
  });
}

/** Keep small originals; otherwise tune quality, then dimensions, to stay within 500 KB. */
export async function compressNewsImage(file: File): Promise<File> {
  if (!SUPPORTED_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG, WebP, or AVIF image.");
  }
  if (!file.size) {
    throw new Error("This image is empty. Choose another file.");
  }
  if (file.size <= NEWS_IMAGE_MAX_BYTES) {
    return file;
  }

  const objectUrl = URL.createObjectURL(file);
  const canvas = document.createElement("canvas");

  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to read this image. Try a JPG, PNG, or WebP file."));
      image.src = objectUrl;
    });

    const context = canvas.getContext("2d");
    if (!context || !image.naturalWidth || !image.naturalHeight) {
      throw new Error("Unable to process this image in your browser.");
    }

    let scale = Math.min(1, 2560 / Math.max(image.naturalWidth, image.naturalHeight));

    for (let pass = 0; pass < 12; pass += 1) {
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      let best = await encodeCanvas(canvas, 0.92);
      if (best.size > NEWS_IMAGE_MAX_BYTES) {
        const smallest = await encodeCanvas(canvas, 0.5);
        if (smallest.size > NEWS_IMAGE_MAX_BYTES) {
          scale *= Math.max(0.5, Math.min(0.85, Math.sqrt(NEWS_IMAGE_MAX_BYTES / smallest.size) * 0.95));
          continue;
        }

        best = smallest;
        let low = 0.5;
        let high = 0.92;
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const quality = (low + high) / 2;
          const candidate = await encodeCanvas(canvas, quality);
          if (candidate.size <= NEWS_IMAGE_MAX_BYTES) {
            best = candidate;
            low = quality;
          } else {
            high = quality;
          }
        }
      }

      // Browsers without WebP encoding may return PNG. Use the actual encoded MIME type.
      const extension = best.type === "image/webp" ? "webp" : "png";
      const baseName = file.name.replace(/\.[^.]+$/, "").trim() || "news-image";
      return new File([best], `${baseName}.${extension}`, {
        type: best.type,
        lastModified: file.lastModified
      });
    }

    throw new Error("Unable to compress this image below 500 KB. Try a smaller image.");
  } finally {
    URL.revokeObjectURL(objectUrl);
    canvas.width = 0;
    canvas.height = 0;
  }
}
