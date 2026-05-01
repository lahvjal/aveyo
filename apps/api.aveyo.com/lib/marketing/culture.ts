import { randomUUID } from "node:crypto";
import type { AuthSessionResult } from "@/lib/auth/types";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/server";

const CULTURE_EVENTS_TABLE = "culture_events";
const CULTURE_ANNOUNCEMENTS_TABLE = "culture_announcements";
const CULTURE_MEDIA_BUCKET = "culture-event-media";
const IMAGE_UPLOAD_LIMIT_BYTES = 10 * 1024 * 1024;
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

interface CultureEventRow {
  id: string;
  title: string;
  event_date: string;
  event_end_date: string | null;
  event_time: string;
  location: string;
  owner_name: string;
  description: string;
  poster_media_kind: "image" | "video" | null;
  poster_media_url: string | null;
  created_at: string;
  updated_at: string;
}

interface CultureAnnouncementRow {
  id: string;
  title: string;
  message: string;
  author_name: string;
  author_initials: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface CultureEvent {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  time: string;
  location: string;
  owner: string;
  description: string;
  posterKind: "image" | "video" | null;
  posterUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CultureAnnouncement {
  id: string;
  title: string;
  message: string;
  authorName: string;
  authorInitials: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CultureFeedResult {
  events: CultureEvent[];
  announcements: CultureAnnouncement[];
}

export class MarketingCultureError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "MarketingCultureError";
  }
}

interface CreateCultureEventPayload {
  title: string;
  date: string;
  endDate: string | null;
  time: string;
  location: string;
  owner: string;
  description: string;
  posterKind: "image" | "video" | null;
  posterUrl: string | null;
  posterFile: File | null;
}

interface CreateCultureAnnouncementPayload {
  title: string;
  message: string;
  authorName: string;
}

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRequiredText(value: unknown, fieldName: string) {
  const trimmed = trimString(value);
  if (!trimmed) {
    throw new MarketingCultureError(`${fieldName} is required.`);
  }
  return trimmed;
}

function normalizeResourceId(value: unknown, fieldName: string) {
  return normalizeRequiredText(value, fieldName);
}

function normalizeOptionalText(value: unknown) {
  const trimmed = trimString(value);
  return trimmed ? trimmed : null;
}

function normalizeEventDate(value: unknown) {
  const normalized = normalizeRequiredText(value, "Date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new MarketingCultureError("Date must be in YYYY-MM-DD format.");
  }

  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new MarketingCultureError("Date must be a valid calendar date.");
  }

  return normalized;
}

function normalizeOptionalEventDate(value: unknown) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }
  return normalizeEventDate(normalized);
}

function validateEventDateRange(startDate: string, endDate: string | null) {
  if (!endDate) {
    return;
  }
  if (Date.parse(`${endDate}T00:00:00.000Z`) < Date.parse(`${startDate}T00:00:00.000Z`)) {
    throw new MarketingCultureError("End date cannot be earlier than the start date.");
  }
}

function normalizeEventTime(value: unknown) {
  const normalized = normalizeRequiredText(value, "Time");
  const match = normalized.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) {
    throw new MarketingCultureError("Time must be in HH:MM format.");
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? "0");
  if (hours > 23 || minutes > 59 || seconds > 59) {
    throw new MarketingCultureError("Time must be a valid 24-hour time.");
  }

  return `${match[1]}:${match[2]}:${String(seconds).padStart(2, "0")}`;
}

function normalizePosterKind(value: unknown) {
  const normalized = trimString(value).toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === "image" || normalized === "video") {
    return normalized;
  }

  throw new MarketingCultureError("Poster media type must be image or video.");
}

function normalizeOptionalHttpUrl(value: unknown, fieldName: string) {
  const normalized = normalizeOptionalText(value);
  if (!normalized) {
    return null;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Unsupported protocol.");
    }
    return normalized;
  } catch {
    throw new MarketingCultureError(`${fieldName} must be a valid http(s) URL.`);
  }
}

function normalizeMimeType(value: string) {
  return value.trim().toLowerCase();
}

function inferPosterKindFromMimeType(value: string) {
  const mimeType = normalizeMimeType(value);
  if (IMAGE_MIME_TYPE_EXTENSIONS.has(mimeType)) {
    return "image" as const;
  }
  if (VIDEO_MIME_TYPE_EXTENSIONS.has(mimeType)) {
    return "video" as const;
  }
  return null;
}

function getPosterUploadLimitBytes(kind: "image" | "video") {
  return kind === "image" ? IMAGE_UPLOAD_LIMIT_BYTES : VIDEO_UPLOAD_LIMIT_BYTES;
}

function formatFileSizeLimit(bytes: number) {
  const megabytes = Math.round((bytes / (1024 * 1024)) * 10) / 10;
  return `${megabytes}MB`;
}

function resolvePosterFileExtension(file: File, kind: "image" | "video") {
  const mimeType = normalizeMimeType(file.type);
  const extension =
    (kind === "image" ? IMAGE_MIME_TYPE_EXTENSIONS : VIDEO_MIME_TYPE_EXTENSIONS).get(mimeType) ??
    file.name.split(".").pop()?.trim().toLowerCase();

  return extension && /^[a-z0-9]{2,8}$/.test(extension)
    ? extension
    : kind === "image"
      ? "jpg"
      : "mp4";
}

function isFileValue(value: FormDataEntryValue | null | undefined): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function readFormDataText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
}

function readFormDataFile(formData: FormData, key: string) {
  const value = formData.get(key);
  if (!isFileValue(value) || value.size <= 0) {
    return null;
  }
  return value;
}

function getInitials(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "AV";
  }

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function toTimestamp(event: Pick<CultureEvent, "date" | "time">) {
  return Date.parse(`${event.date}T${event.time}`);
}

function mapCultureEventRow(row: CultureEventRow): CultureEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.event_date,
    endDate: row.event_end_date,
    time: row.event_time.slice(0, 5),
    location: row.location,
    owner: row.owner_name,
    description: row.description,
    posterKind: row.poster_media_kind,
    posterUrl: row.poster_media_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCultureAnnouncementRow(row: CultureAnnouncementRow): CultureAnnouncement {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    authorName: row.author_name,
    authorInitials: normalizeOptionalText(row.author_initials) ?? getInitials(row.author_name),
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function sortCultureEvents(events: CultureEvent[]) {
  return [...events].sort((left, right) => {
    const leftTime = toTimestamp(left);
    const rightTime = toTimestamp(right);
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
      return left.title.localeCompare(right.title);
    }
    return leftTime - rightTime;
  });
}

function assertEmployeeCultureAccess(session: AuthSessionResult) {
  if (!session.authenticated) {
    throw new MarketingCultureError("Authentication required.", 401);
  }
  if (session.userType !== "employee") {
    throw new MarketingCultureError("Employee access required.", 403);
  }
}

function assertManageCultureAccess(session: AuthSessionResult) {
  assertEmployeeCultureAccess(session);
  if (!session.access.isAdmin) {
    throw new MarketingCultureError("Admin access required.", 403);
  }
}

function coerceCultureEventPayload(payload: unknown): CreateCultureEventPayload {
  if (payload instanceof FormData) {
    const date = normalizeEventDate(readFormDataText(payload, "date"));
    const endDate = normalizeOptionalEventDate(
      readFormDataText(payload, "endDate") ?? readFormDataText(payload, "end_date")
    );
    validateEventDateRange(date, endDate);

    const posterKind = normalizePosterKind(
      readFormDataText(payload, "posterKind") ?? readFormDataText(payload, "poster_kind")
    );
    const posterUrl = normalizeOptionalHttpUrl(
      readFormDataText(payload, "posterUrl") ?? readFormDataText(payload, "poster_url"),
      "Poster media URL"
    );
    const posterFile =
      readFormDataFile(payload, "posterFile") ?? readFormDataFile(payload, "poster_file");

    if (!posterFile && ((posterKind && !posterUrl) || (!posterKind && posterUrl))) {
      throw new MarketingCultureError(
        "Poster media type and poster media URL must be provided together."
      );
    }

    return {
      title: normalizeRequiredText(readFormDataText(payload, "title"), "Title"),
      date,
      endDate,
      time: normalizeEventTime(readFormDataText(payload, "time")),
      location: normalizeRequiredText(readFormDataText(payload, "location"), "Location"),
      owner: normalizeRequiredText(readFormDataText(payload, "owner"), "Owner"),
      description: normalizeRequiredText(readFormDataText(payload, "description"), "Description"),
      posterKind,
      posterUrl,
      posterFile
    };
  }

  if (!payload || typeof payload !== "object") {
    throw new MarketingCultureError("Request body must be a JSON object or multipart form.");
  }

  const record = payload as Record<string, unknown>;
  const posterKind = normalizePosterKind(record.posterKind ?? record.poster_kind);
  const posterUrl = normalizeOptionalHttpUrl(
    record.posterUrl ?? record.poster_url,
    "Poster media URL"
  );

  if ((posterKind && !posterUrl) || (!posterKind && posterUrl)) {
    throw new MarketingCultureError(
      "Poster media type and poster media URL must be provided together."
    );
  }

  const date = normalizeEventDate(record.date);
  const endDate = normalizeOptionalEventDate(record.endDate ?? record.end_date);
  validateEventDateRange(date, endDate);

  return {
    title: normalizeRequiredText(record.title, "Title"),
    date,
    endDate,
    time: normalizeEventTime(record.time),
    location: normalizeRequiredText(record.location, "Location"),
    owner: normalizeRequiredText(record.owner, "Owner"),
    description: normalizeRequiredText(record.description, "Description"),
    posterKind,
    posterUrl,
    posterFile: null
  };
}

function coerceCreateCultureAnnouncementPayload(payload: unknown): CreateCultureAnnouncementPayload {
  if (!payload || typeof payload !== "object" || payload instanceof FormData) {
    throw new MarketingCultureError("Request body must be a JSON object.");
  }

  const record = payload as Record<string, unknown>;
  return {
    title: normalizeRequiredText(record.title, "Title"),
    message: normalizeRequiredText(record.message, "Message"),
    authorName: normalizeRequiredText(record.authorName ?? record.author_name, "Author")
  };
}

async function uploadCulturePosterMedia(
  file: File,
  session: AuthSessionResult,
  providedKind: "image" | "video" | null
) {
  const inferredKind = inferPosterKindFromMimeType(file.type);
  if (!inferredKind) {
    throw new MarketingCultureError(
      "Poster upload must be a supported image or video file (jpg, png, webp, gif, avif, mp4, webm, mov)."
    );
  }

  if (providedKind && providedKind !== inferredKind) {
    throw new MarketingCultureError(
      `Poster media type is set to ${providedKind}, but the uploaded file is ${inferredKind}.`
    );
  }

  const uploadLimitBytes = getPosterUploadLimitBytes(inferredKind);
  if (file.size > uploadLimitBytes) {
    throw new MarketingCultureError(
      `Uploaded ${inferredKind} files must be ${formatFileSizeLimit(uploadLimitBytes)} or smaller.`
    );
  }

  const extension = resolvePosterFileExtension(file, inferredKind);
  const objectPath = `events/${session.user?.id ?? "unknown-user"}/${Date.now()}-${randomUUID()}.${extension}`;
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const fileBytes = new Uint8Array(await file.arrayBuffer());
  const { error: uploadError } = await supabaseServiceRoleClient.storage
    .from(CULTURE_MEDIA_BUCKET)
    .upload(objectPath, fileBytes, {
      cacheControl: "3600",
      contentType: normalizeMimeType(file.type) || undefined,
      upsert: false
    });

  if (uploadError) {
    throw new MarketingCultureError(
      `Unable to upload poster media: ${uploadError.message}`,
      500
    );
  }

  const {
    data: { publicUrl }
  } = supabaseServiceRoleClient.storage.from(CULTURE_MEDIA_BUCKET).getPublicUrl(objectPath);

  return {
    kind: inferredKind,
    objectPath,
    publicUrl
  };
}

async function deleteCulturePosterMedia(objectPath: string) {
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  await supabaseServiceRoleClient.storage.from(CULTURE_MEDIA_BUCKET).remove([objectPath]);
}

function getCultureMediaObjectPathFromUrl(value: string | null) {
  const normalizedUrl = normalizeOptionalText(value);
  if (!normalizedUrl) {
    return null;
  }

  try {
    const parsed = new URL(normalizedUrl);
    const publicPrefix = `/storage/v1/object/public/${CULTURE_MEDIA_BUCKET}/`;
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

async function deleteCulturePosterMediaByUrl(url: string | null) {
  const objectPath = getCultureMediaObjectPathFromUrl(url);
  if (!objectPath) {
    return;
  }

  await deleteCulturePosterMedia(objectPath);
}

async function getCultureEventRowById(eventId: string) {
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const { data, error } = await supabaseServiceRoleClient
    .from(CULTURE_EVENTS_TABLE)
    .select(
      "id, title, event_date, event_end_date, event_time, location, owner_name, description, poster_media_kind, poster_media_url, created_at, updated_at"
    )
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw new MarketingCultureError(`Unable to load culture event: ${error.message}`, 500);
  }

  return (data as CultureEventRow | null) ?? null;
}

async function listCultureEvents() {
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const { data, error } = await supabaseServiceRoleClient
    .from(CULTURE_EVENTS_TABLE)
    .select(
      "id, title, event_date, event_end_date, event_time, location, owner_name, description, poster_media_kind, poster_media_url, created_at, updated_at"
    )
    .order("event_date", { ascending: true })
    .order("event_time", { ascending: true })
    .limit(200);

  if (error) {
    throw new MarketingCultureError(`Unable to load culture events: ${error.message}`, 500);
  }

  return sortCultureEvents(((data ?? []) as CultureEventRow[]).map(mapCultureEventRow));
}

async function listCultureAnnouncements() {
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const { data, error } = await supabaseServiceRoleClient
    .from(CULTURE_ANNOUNCEMENTS_TABLE)
    .select("id, title, message, author_name, author_initials, published_at, created_at, updated_at")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new MarketingCultureError(
      `Unable to load culture announcements: ${error.message}`,
      500
    );
  }

  return ((data ?? []) as CultureAnnouncementRow[]).map(mapCultureAnnouncementRow);
}

export async function listCultureFeed(session: AuthSessionResult): Promise<CultureFeedResult> {
  assertEmployeeCultureAccess(session);

  const [events, announcements] = await Promise.all([
    listCultureEvents(),
    listCultureAnnouncements()
  ]);

  return {
    events,
    announcements
  };
}

export async function createCultureEvent(payload: unknown, session: AuthSessionResult) {
  assertManageCultureAccess(session);

  const normalizedPayload = coerceCultureEventPayload(payload);
  let posterKind = normalizedPayload.posterKind;
  let posterUrl = normalizedPayload.posterUrl;
  let uploadedPosterPath: string | null = null;

  if (normalizedPayload.posterFile) {
    const uploadResult = await uploadCulturePosterMedia(
      normalizedPayload.posterFile,
      session,
      normalizedPayload.posterKind
    );
    posterKind = uploadResult.kind;
    posterUrl = uploadResult.publicUrl;
    uploadedPosterPath = uploadResult.objectPath;
  }

  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  try {
    const { data, error } = await supabaseServiceRoleClient
      .from(CULTURE_EVENTS_TABLE)
      .insert({
        title: normalizedPayload.title,
        event_date: normalizedPayload.date,
        event_end_date: normalizedPayload.endDate,
        event_time: normalizedPayload.time,
        location: normalizedPayload.location,
        owner_name: normalizedPayload.owner,
        description: normalizedPayload.description,
        poster_media_kind: posterKind,
        poster_media_url: posterUrl
      })
      .select(
        "id, title, event_date, event_end_date, event_time, location, owner_name, description, poster_media_kind, poster_media_url, created_at, updated_at"
      )
      .maybeSingle();

    if (error || !data) {
      throw new MarketingCultureError(
        `Unable to create culture event: ${error?.message ?? "Unknown database error."}`,
        500
      );
    }

    return mapCultureEventRow(data as CultureEventRow);
  } catch (error) {
    if (uploadedPosterPath) {
      await deleteCulturePosterMedia(uploadedPosterPath).catch(() => undefined);
    }
    throw error;
  }
}

export async function updateCultureEvent(
  eventId: string,
  payload: unknown,
  session: AuthSessionResult
) {
  assertManageCultureAccess(session);

  const normalizedEventId = normalizeResourceId(eventId, "Event ID");
  const existingEvent = await getCultureEventRowById(normalizedEventId);
  if (!existingEvent) {
    throw new MarketingCultureError("Culture event not found.", 404);
  }

  const normalizedPayload = coerceCultureEventPayload(payload);
  let posterKind = normalizedPayload.posterKind;
  let posterUrl = normalizedPayload.posterUrl;
  let uploadedPosterPath: string | null = null;

  if (normalizedPayload.posterFile) {
    const uploadResult = await uploadCulturePosterMedia(
      normalizedPayload.posterFile,
      session,
      normalizedPayload.posterKind
    );
    posterKind = uploadResult.kind;
    posterUrl = uploadResult.publicUrl;
    uploadedPosterPath = uploadResult.objectPath;
  }

  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  try {
    const { data, error } = await supabaseServiceRoleClient
      .from(CULTURE_EVENTS_TABLE)
      .update({
        title: normalizedPayload.title,
        event_date: normalizedPayload.date,
        event_end_date: normalizedPayload.endDate,
        event_time: normalizedPayload.time,
        location: normalizedPayload.location,
        owner_name: normalizedPayload.owner,
        description: normalizedPayload.description,
        poster_media_kind: posterKind,
        poster_media_url: posterUrl
      })
      .eq("id", normalizedEventId)
      .select(
        "id, title, event_date, event_end_date, event_time, location, owner_name, description, poster_media_kind, poster_media_url, created_at, updated_at"
      )
      .maybeSingle();

    if (error) {
      throw new MarketingCultureError(`Unable to update culture event: ${error.message}`, 500);
    }

    if (!data) {
      throw new MarketingCultureError("Culture event not found.", 404);
    }

    if (existingEvent.poster_media_url && existingEvent.poster_media_url !== posterUrl) {
      await deleteCulturePosterMediaByUrl(existingEvent.poster_media_url).catch(() => undefined);
    }

    return mapCultureEventRow(data as CultureEventRow);
  } catch (error) {
    if (uploadedPosterPath) {
      await deleteCulturePosterMedia(uploadedPosterPath).catch(() => undefined);
    }
    throw error;
  }
}

export async function createCultureAnnouncement(payload: unknown, session: AuthSessionResult) {
  assertManageCultureAccess(session);

  const normalizedPayload = coerceCreateCultureAnnouncementPayload(payload);
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const { data, error } = await supabaseServiceRoleClient
    .from(CULTURE_ANNOUNCEMENTS_TABLE)
    .insert({
      title: normalizedPayload.title,
      message: normalizedPayload.message,
      author_name: normalizedPayload.authorName,
      author_initials: getInitials(normalizedPayload.authorName),
      published_at: new Date().toISOString()
    })
    .select("id, title, message, author_name, author_initials, published_at, created_at, updated_at")
    .maybeSingle();

  if (error || !data) {
    throw new MarketingCultureError(
      `Unable to create culture announcement: ${error?.message ?? "Unknown database error."}`,
      500
    );
  }

  return mapCultureAnnouncementRow(data as CultureAnnouncementRow);
}

export async function deleteCultureEvent(eventId: string, session: AuthSessionResult) {
  assertManageCultureAccess(session);

  const normalizedEventId = normalizeResourceId(eventId, "Event ID");
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const { data, error } = await supabaseServiceRoleClient
    .from(CULTURE_EVENTS_TABLE)
    .delete()
    .eq("id", normalizedEventId)
    .select("id, poster_media_url")
    .maybeSingle();

  if (error) {
    throw new MarketingCultureError(`Unable to delete culture event: ${error.message}`, 500);
  }

  if (!data) {
    throw new MarketingCultureError("Culture event not found.", 404);
  }

  await deleteCulturePosterMediaByUrl((data as { poster_media_url: string | null }).poster_media_url).catch(
    () => undefined
  );
}

export async function deleteCultureAnnouncement(
  announcementId: string,
  session: AuthSessionResult
) {
  assertManageCultureAccess(session);

  const normalizedAnnouncementId = normalizeResourceId(announcementId, "Announcement ID");
  const supabaseServiceRoleClient = getSupabaseServiceRoleClient();
  const { data, error } = await supabaseServiceRoleClient
    .from(CULTURE_ANNOUNCEMENTS_TABLE)
    .delete()
    .eq("id", normalizedAnnouncementId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new MarketingCultureError(
      `Unable to delete culture announcement: ${error.message}`,
      500
    );
  }

  if (!data) {
    throw new MarketingCultureError("Culture announcement not found.", 404);
  }
}
