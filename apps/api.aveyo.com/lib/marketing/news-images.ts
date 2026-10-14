import { randomUUID } from "node:crypto";
import type { AuthSessionResult } from "@/lib/auth/types";
import { assertEmployeeNewsAccess, MarketingNewsError } from "@/lib/marketing/news";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const NEWS_MEDIA_BUCKET = "marketing-site-media";
const NEWS_IMAGE_MAX_BYTES = 500 * 1024;
const IMAGE_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"]
]);

export async function uploadMarketingNewsImage(payload: FormData, session: AuthSessionResult) {
  assertEmployeeNewsAccess(session);

  const file = payload.get("file");
  if (!(file instanceof File) || !file.size) {
    throw new MarketingNewsError("An image file is required.");
  }
  const extension = IMAGE_EXTENSIONS.get(file.type);
  if (!extension) {
    throw new MarketingNewsError("Choose a JPG, PNG, WebP, or AVIF image.");
  }
  if (file.size > NEWS_IMAGE_MAX_BYTES) {
    throw new MarketingNewsError("Images must be compressed to 500 KB or smaller before uploading.", 413);
  }

  const storagePath = `news/${randomUUID()}.${extension}`;
  const storage = getSupabaseServiceRoleClient().storage.from(NEWS_MEDIA_BUCKET);
  const { error } = await storage.upload(storagePath, new Uint8Array(await file.arrayBuffer()), {
    contentType: file.type,
    cacheControl: "31536000",
    upsert: false
  });
  if (error) {
    throw new MarketingNewsError("Unable to upload this image. Please try again.", 500);
  }

  const { data: { publicUrl } } = storage.getPublicUrl(storagePath);
  return { url: publicUrl, size: file.size, name: file.name };
}
