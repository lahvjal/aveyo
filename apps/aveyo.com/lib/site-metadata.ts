import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";

export const siteName = "Aveyo Solar";
export const siteTitle = "Aveyo Solar | Power What Matters Most";
export const siteDescription =
  "Spend less on power, spend more on life. Go solar with Aveyo for custom system design, permitting, installation, and project support.";
export const siteUrl = "https://aveyo.com";
export const metadataBase = new URL(siteUrl);
export const socialHeadline = "Power What Matters Most";
export const socialSubheadline = "Spend less on power. Spend more on life.";
export const socialSupportLine =
  "Custom solar design, permitting, installation, and project support.";

const PUBLIC_DIR = join(process.cwd(), "public");
const MIME_BY_EXTENSION: Record<string, string> = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

// Keep the supported asset list explicit so Next/Vercel traces only these files
// into image route bundles instead of the entire marketing public directory.
const PUBLIC_ASSET_PATHS = {
  "aveyo-icon.svg": join(PUBLIC_DIR, "aveyo-icon.svg"),
  "aveyo-logo.svg": join(PUBLIC_DIR, "aveyo-logo.svg"),
  "images/og-preview-bg.jpg": join(PUBLIC_DIR, "images", "og-preview-bg.jpg")
} as const;

export async function getPublicAssetDataUri(relativePath: string) {
  const normalizedPath = relativePath.replace(/^\/+/, "");
  const mimeType = MIME_BY_EXTENSION[extname(normalizedPath).toLowerCase()];
  if (!mimeType) {
    throw new Error(`Unsupported asset type for ${relativePath}.`);
  }

  const assetPath = PUBLIC_ASSET_PATHS[normalizedPath as keyof typeof PUBLIC_ASSET_PATHS];
  if (!assetPath) {
    throw new Error(`Unsupported public asset for ${relativePath}.`);
  }

  const asset = await readFile(assetPath);
  return `data:${mimeType};base64,${asset.toString("base64")}`;
}
