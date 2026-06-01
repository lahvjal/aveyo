import { getApiBaseUrl } from "@/lib/auth/session";

export interface MarketingSitePhotoRecord {
  slotKey: string;
  defaultSrc: string;
  mediaUrl: string;
  storagePath: string;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MarketingSitePhotoOverrides = Record<string, MarketingSitePhotoRecord>;

export function buildMarketingSitePhotoSlotKey(src: string) {
  const normalized = src
    .trim()
    .replace(/^https?:\/\/[^/]+/i, "")
    .replace(/^\//, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized.slice(0, 240);
}

export function resolveMarketingSitePhotoSrc(
  slotKey: string,
  defaultSrc: string,
  overrides: MarketingSitePhotoOverrides
) {
  return overrides[slotKey]?.mediaUrl ?? defaultSrc;
}

export async function fetchMarketingSitePhotoOverrides(): Promise<MarketingSitePhotoOverrides> {
  const response = await fetch(`${getApiBaseUrl()}/api/marketing/site-photos`, {
    credentials: "include"
  });

  if (!response.ok) {
    throw new Error("Unable to load marketing site photo overrides.");
  }

  const payload = (await response.json()) as { photos?: MarketingSitePhotoOverrides };
  return payload.photos ?? {};
}

export async function uploadMarketingSitePhoto(input: {
  slotKey: string;
  defaultSrc: string;
  file: File;
}) {
  const formData = new FormData();
  formData.set("slotKey", input.slotKey);
  formData.set("defaultSrc", input.defaultSrc);
  formData.set("file", input.file);

  const response = await fetch(`${getApiBaseUrl()}/api/marketing/site-photos`, {
    method: "POST",
    credentials: "include",
    body: formData
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string" ? payload.error : "Unable to upload site photo."
    );
  }

  return payload.photo as MarketingSitePhotoRecord;
}

export async function resetMarketingSitePhoto(slotKey: string) {
  const response = await fetch(
    `${getApiBaseUrl()}/api/marketing/site-photos/${encodeURIComponent(slotKey)}`,
    {
      method: "DELETE",
      credentials: "include"
    }
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof payload?.error === "string" ? payload.error : "Unable to reset site photo."
    );
  }

  return payload;
}
