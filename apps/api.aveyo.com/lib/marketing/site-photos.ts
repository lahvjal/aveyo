import { randomUUID } from "node:crypto";
import type { AuthSessionResult } from "@/lib/auth/types";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const SITE_PHOTOS_TABLE = "marketing_site_photos";
const SITE_MEDIA_BUCKET = "marketing-site-media";
const IMAGE_UPLOAD_LIMIT_BYTES = 3 * 1024 * 1024;
const VIDEO_UPLOAD_LIMIT_BYTES = 40 * 1024 * 1024;
const IMAGE_MIME_TYPE_EXTENSIONS = new Map<string, string>([
  ["image/avif", "avif"],
  ["image/gif", "gif"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);
const VIDEO_MIME_TYPE_EXTENSIONS = new Map<string, string>([
  ["video/mp4", "mp4"],
  ["video/quicktime", "mov"],
  ["video/webm", "webm"]
]);

interface SitePhotoRow {
  slot_key: string;
  default_src: string;
  media_url: string;
  storage_path: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketingSitePhoto {
  slotKey: string;
  defaultSrc: string;
  mediaUrl: string;
  storagePath: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingSitePhotoMap {
  photos: Record<string, MarketingSitePhoto>;
}

export class MarketingSitePhotoError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "MarketingSitePhotoError";
  }
}

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeMimeType(value: string) {
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

function resolveImageExtension(file: File) {
  const normalizedMimeType = normalizeMimeType(file.type);
  const extensionFromMime = IMAGE_MIME_TYPE_EXTENSIONS.get(normalizedMimeType);
  if (extensionFromMime) {
    return extensionFromMime;
  }

  const fileName = file.name.trim().toLowerCase();
  const extensionFromName = fileName.includes(".") ? fileName.split(".").pop() : null;
  if (extensionFromName && ["avif", "gif", "jpg", "jpeg", "png", "webp"].includes(extensionFromName)) {
    return extensionFromName === "jpeg" ? "jpg" : extensionFromName;
  }

  throw new MarketingSitePhotoError("Uploaded file must be a supported image (jpg, png, webp, gif, avif).");
}

function resolveVideoExtension(file: File) {
  const normalizedMimeType = normalizeMimeType(file.type);
  const extensionFromMime = VIDEO_MIME_TYPE_EXTENSIONS.get(normalizedMimeType);
  if (extensionFromMime) {
    return extensionFromMime;
  }

  const fileName = file.name.trim().toLowerCase();
  const extensionFromName = fileName.includes(".") ? fileName.split(".").pop() : null;
  if (extensionFromName && ["mp4", "mov", "webm"].includes(extensionFromName)) {
    return extensionFromName;
  }

  throw new MarketingSitePhotoError("Uploaded file must be a supported video (mp4, webm, mov).");
}

function inferSiteMediaKind(file: File): "image" | "video" {
  if (file.type.startsWith("image/")) {
    return "image";
  }
  if (file.type.startsWith("video/")) {
    return "video";
  }

  const fileName = file.name.trim().toLowerCase();
  if (/\.(mp4|mov|webm)$/.test(fileName)) {
    return "video";
  }
  if (/\.(avif|gif|jpe?g|png|webp)$/.test(fileName)) {
    return "image";
  }

  throw new MarketingSitePhotoError("Uploaded file must be a supported image or video.");
}

function formatFileSizeLimit(bytes: number) {
  const mb = bytes / 1024 / 1024;
  return `${mb % 1 === 0 ? mb.toFixed(0) : mb.toFixed(1)}MB`;
}

function normalizeSlotKey(value: unknown) {
  const slotKey = trimString(value);
  if (!slotKey) {
    throw new MarketingSitePhotoError("Photo slot key is required.");
  }
  if (slotKey.length > 240) {
    throw new MarketingSitePhotoError("Photo slot key is too long.");
  }
  if (!/^[a-z0-9][a-z0-9._-]*$/i.test(slotKey)) {
    throw new MarketingSitePhotoError("Photo slot key contains invalid characters.");
  }
  return slotKey;
}

function normalizeDefaultSrc(value: unknown) {
  const defaultSrc = trimString(value);
  if (!defaultSrc) {
    throw new MarketingSitePhotoError("Default image source is required.");
  }
  if (defaultSrc.length > 2048) {
    throw new MarketingSitePhotoError("Default image source is too long.");
  }
  return defaultSrc;
}

export function buildMarketingSitePhotoSlotKey(src: string) {
  const normalized = src
    .trim()
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  if (!normalized) {
    throw new MarketingSitePhotoError("Unable to derive a photo slot key from the image source.");
  }

  return normalized.slice(0, 240);
}

function isMarketingDepartmentName(value: string | null | undefined) {
  return typeof value === "string" && value.toLowerCase().includes("marketing");
}

export function canManageMarketingSitePhotos(session: AuthSessionResult) {
  if (!session.authenticated || session.userType !== "employee") {
    return false;
  }

  if (session.access.isAdmin || session.access.isSuperAdmin) {
    return true;
  }

  if (isMarketingDepartmentName(session.access.departmentName)) {
    return true;
  }

  return session.access.departmentPath.some((department) => isMarketingDepartmentName(department.name));
}

export function assertManageMarketingSitePhotosAccess(session: AuthSessionResult) {
  if (!session.authenticated) {
    throw new MarketingSitePhotoError("Authentication required.", 401);
  }
  if (!canManageMarketingSitePhotos(session)) {
    throw new MarketingSitePhotoError("Marketing team access required.", 403);
  }
}

function mapSitePhotoRow(row: SitePhotoRow): MarketingSitePhoto {
  return {
    slotKey: row.slot_key,
    defaultSrc: row.default_src,
    mediaUrl: row.media_url,
    storagePath: row.storage_path,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getSiteMediaObjectPathFromUrl(value: string | null) {
  const normalizedUrl = trimString(value);
  if (!normalizedUrl) {
    return null;
  }

  try {
    const parsed = new URL(normalizedUrl);
    const publicPrefix = `/storage/v1/object/public/${SITE_MEDIA_BUCKET}/`;
    const pathIndex = parsed.pathname.indexOf(publicPrefix);
    if (pathIndex === -1) {
      return null;
    }

    const objectPath = parsed.pathname.slice(pathIndex + publicPrefix.length);
    return objectPath ? decodeURIComponent(objectPath) : null;
  } catch {
    return null;
  }
}

async function deleteSiteMediaObject(objectPath: string) {
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  await supabaseServiceRoleClient.storage.from(SITE_MEDIA_BUCKET).remove([objectPath]);
}

async function uploadSitePhotoMedia(file: File, session: AuthSessionResult, slotKey: string) {
  const mediaKind = inferSiteMediaKind(file);
  const uploadLimitBytes =
    mediaKind === "video" ? VIDEO_UPLOAD_LIMIT_BYTES : IMAGE_UPLOAD_LIMIT_BYTES;

  if (file.size > uploadLimitBytes) {
    throw new MarketingSitePhotoError(
      `Uploaded ${mediaKind}s must be ${formatFileSizeLimit(uploadLimitBytes)} or smaller.`
    );
  }

  const extension = mediaKind === "video" ? resolveVideoExtension(file) : resolveImageExtension(file);
  const objectPath = `${mediaKind === "video" ? "videos" : "photos"}/${slotKey}/${Date.now()}-${randomUUID()}.${extension}`;
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabaseServiceRoleClient.storage
    .from(SITE_MEDIA_BUCKET)
    .upload(objectPath, fileBytes, {
      cacheControl: "3600",
      contentType: normalizeMimeType(file.type) || undefined,
      upsert: false
    });

  if (uploadError) {
    throw new MarketingSitePhotoError(`Unable to upload site photo: ${uploadError.message}`, 500);
  }

  const {
    data: { publicUrl }
  } = supabaseServiceRoleClient.storage.from(SITE_MEDIA_BUCKET).getPublicUrl(objectPath);

  return {
    objectPath,
    publicUrl
  };
}

export async function listMarketingSitePhotos(): Promise<MarketingSitePhotoMap> {
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const { data, error } = await supabaseServiceRoleClient
    .from(SITE_PHOTOS_TABLE)
    .select("slot_key, default_src, media_url, storage_path, updated_by, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new MarketingSitePhotoError(`Unable to load site photos: ${error.message}`, 500);
  }

  const photos: Record<string, MarketingSitePhoto> = {};
  for (const row of (data ?? []) as SitePhotoRow[]) {
    photos[row.slot_key] = mapSitePhotoRow(row);
  }

  return { photos };
}

export async function getMarketingSitePhoto(slotKey: string) {
  const normalizedSlotKey = normalizeSlotKey(slotKey);
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const { data, error } = await supabaseServiceRoleClient
    .from(SITE_PHOTOS_TABLE)
    .select("slot_key, default_src, media_url, storage_path, updated_by, created_at, updated_at")
    .eq("slot_key", normalizedSlotKey)
    .maybeSingle();

  if (error) {
    throw new MarketingSitePhotoError(`Unable to load site photo: ${error.message}`, 500);
  }

  return data ? mapSitePhotoRow(data as SitePhotoRow) : null;
}

export async function upsertMarketingSitePhoto(payload: unknown, session: AuthSessionResult) {
  assertManageMarketingSitePhotosAccess(session);

  if (!(payload instanceof FormData)) {
    throw new MarketingSitePhotoError("Photo upload must be sent as multipart form data.");
  }

  const slotKey = normalizeSlotKey(payload.get("slotKey") ?? payload.get("slot_key"));
  const defaultSrc = normalizeDefaultSrc(payload.get("defaultSrc") ?? payload.get("default_src"));
  const file = payload.get("file");

  if (!(file instanceof File) || file.size === 0) {
    throw new MarketingSitePhotoError("Media file is required.");
  }

  const existingPhoto = await getMarketingSitePhoto(slotKey);
  const uploadResult = await uploadSitePhotoMedia(file, session, slotKey);

  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const { data, error } = await supabaseServiceRoleClient
    .from(SITE_PHOTOS_TABLE)
    .upsert(
      {
        slot_key: slotKey,
        default_src: defaultSrc,
        media_url: uploadResult.publicUrl,
        storage_path: uploadResult.objectPath,
        updated_by: session.user?.id ?? null,
        updated_at: new Date().toISOString()
      },
      { onConflict: "slot_key" }
    )
    .select("slot_key, default_src, media_url, storage_path, updated_by, created_at, updated_at")
    .maybeSingle();

  if (error || !data) {
    await deleteSiteMediaObject(uploadResult.objectPath);
    throw new MarketingSitePhotoError(
      `Unable to save site photo override: ${error?.message ?? "Unknown error"}`,
      500
    );
  }

  if (existingPhoto?.storagePath && existingPhoto.storagePath !== uploadResult.objectPath) {
    await deleteSiteMediaObject(existingPhoto.storagePath);
  }

  return mapSitePhotoRow(data as SitePhotoRow);
}

export async function resetMarketingSitePhoto(slotKey: string, session: AuthSessionResult) {
  assertManageMarketingSitePhotosAccess(session);

  const normalizedSlotKey = normalizeSlotKey(slotKey);
  const existingPhoto = await getMarketingSitePhoto(normalizedSlotKey);
  if (!existingPhoto) {
    throw new MarketingSitePhotoError("Site photo override not found.", 404);
  }

  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const { error } = await supabaseServiceRoleClient
    .from(SITE_PHOTOS_TABLE)
    .delete()
    .eq("slot_key", normalizedSlotKey);

  if (error) {
    throw new MarketingSitePhotoError(`Unable to reset site photo: ${error.message}`, 500);
  }

  const objectPath =
    existingPhoto.storagePath || getSiteMediaObjectPathFromUrl(existingPhoto.mediaUrl);
  if (objectPath) {
    await deleteSiteMediaObject(objectPath);
  }

  return { slotKey: normalizedSlotKey, reset: true as const };
}
