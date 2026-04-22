import { createSocialPreviewImage, socialImageSize } from "@/lib/social-preview-image";

export const runtime = "nodejs";
export const alt = "Aveyo Solar link preview";
export const size = socialImageSize;
export const contentType = "image/png";

export default async function OpenGraphImage() {
  return createSocialPreviewImage();
}
