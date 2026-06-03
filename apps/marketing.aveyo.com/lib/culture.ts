import { authApiRequest } from "@/lib/auth/session";

export type CulturePosterKind = "image" | "video";

export interface CultureEventPoster {
  id: string;
  kind: CulturePosterKind;
  url: string;
  sortOrder: number;
}

export interface CultureEvent {
  id: string;
  title: string;
  date: string;
  endDate: string | null;
  isAllDay: boolean;
  time: string;
  location: string;
  owner: string;
  description: string;
  posters: CultureEventPoster[];
  posterKind: CulturePosterKind | null;
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

export interface CultureFeedResponse {
  events: CultureEvent[];
  announcements: CultureAnnouncement[];
}

export interface CultureEventPosterInput {
  sortOrder: number;
  posterKind?: CulturePosterKind | "";
  posterUrl?: string;
  posterFile?: File | null;
}

export interface NewCultureEventInput {
  title: string;
  date: string;
  endDate?: string;
  isAllDay?: boolean;
  time: string;
  location: string;
  owner: string;
  description: string;
  posters?: CultureEventPosterInput[];
  posterKind?: CulturePosterKind | "";
  posterUrl?: string;
  posterFile?: File | null;
}

export interface NewCultureAnnouncementInput {
  title: string;
  message: string;
  authorName: string;
}

export function getEventPosters(event: CultureEvent): CultureEventPoster[] {
  const posters =
    event.posters.length > 0
      ? event.posters
      : event.posterUrl && event.posterKind
        ? [
            {
              id: `${event.id}-legacy-poster`,
              kind: event.posterKind,
              url: event.posterUrl,
              sortOrder: 0
            }
          ]
        : [];

  return [...posters].sort((left, right) => left.sortOrder - right.sortOrder);
}

function resolvePosterInputs(input: NewCultureEventInput) {
  return (
    input.posters ??
    (input.posterFile || input.posterUrl?.trim() || input.posterKind
      ? [
          {
            sortOrder: 0,
            posterKind: input.posterKind,
            posterUrl: input.posterUrl,
            posterFile: input.posterFile ?? null
          }
        ]
      : [])
  );
}

function getActivePosterInputs(posters: CultureEventPosterInput[]) {
  return posters.filter(
    (poster) => poster.posterFile || poster.posterUrl?.trim() || poster.posterKind
  );
}

function sortPosterInputs(posters: CultureEventPosterInput[]) {
  return [...getActivePosterInputs(posters)].sort((left, right) => left.sortOrder - right.sortOrder);
}

function buildPosterMetadata(posters: CultureEventPosterInput[]) {
  return sortPosterInputs(posters).map((poster, index) => ({
    sortOrder: index,
    posterKind: poster.posterKind?.trim() ? poster.posterKind : undefined,
    posterUrl: poster.posterUrl?.trim() ? poster.posterUrl.trim() : undefined,
    fileKey: poster.posterFile ? `posterFile_${index}` : undefined
  }));
}

function buildCultureEventPayload(input: NewCultureEventInput) {
  const posters = resolvePosterInputs(input);

  return {
    title: input.title,
    date: input.date,
    endDate: input.endDate?.trim() ? input.endDate.trim() : undefined,
    isAllDay: Boolean(input.isAllDay),
    time: input.time,
    location: input.location,
    owner: input.owner,
    description: input.description,
    posters: buildPosterMetadata(posters)
  };
}

function buildCultureEventFormData(input: NewCultureEventInput) {
  const formData = new FormData();
  const payload = buildCultureEventPayload(input);
  const activePosters = sortPosterInputs(resolvePosterInputs(input));

  formData.set("title", payload.title);
  formData.set("date", payload.date);
  if (payload.endDate) {
    formData.set("endDate", payload.endDate);
  }
  if (payload.isAllDay) {
    formData.set("isAllDay", "true");
  }
  formData.set("time", payload.time);
  formData.set("location", payload.location);
  formData.set("owner", payload.owner);
  formData.set("description", payload.description);

  if (payload.posters.length > 0) {
    formData.set("posters", JSON.stringify(payload.posters));
  }

  activePosters.forEach((poster, index) => {
    if (poster.posterFile) {
      formData.set(`posterFile_${index}`, poster.posterFile);
    }
  });

  return formData;
}

function buildCultureEventRequestBody(input: NewCultureEventInput) {
  return buildCultureEventFormData(input);
}

export async function listCultureFeed() {
  return authApiRequest<CultureFeedResponse>("/api/marketing/culture", { method: "GET" });
}

export async function createCultureEvent(input: NewCultureEventInput) {
  const payload = await authApiRequest<{ event: CultureEvent }>("/api/marketing/culture", {
    method: "POST",
    body: buildCultureEventRequestBody(input)
  });

  return payload.event;
}

export async function updateCultureEvent(eventId: string, input: NewCultureEventInput) {
  const payload = await authApiRequest<{ event: CultureEvent }>(
    `/api/marketing/culture/events/${eventId}`,
    {
      method: "PATCH",
      body: buildCultureEventRequestBody(input)
    }
  );

  return payload.event;
}

export async function deleteCultureEvent(eventId: string) {
  await authApiRequest<{ success: true }>(`/api/marketing/culture/events/${eventId}`, {
    method: "DELETE"
  });
}

export async function createCultureAnnouncement(input: NewCultureAnnouncementInput) {
  const payload = await authApiRequest<{ announcement: CultureAnnouncement }>(
    "/api/marketing/culture/announcements",
    {
      method: "POST",
      body: JSON.stringify({
        title: input.title,
        message: input.message,
        authorName: input.authorName
      })
    }
  );

  return payload.announcement;
}

export async function deleteCultureAnnouncement(announcementId: string) {
  await authApiRequest<{ success: true }>(
    `/api/marketing/culture/announcements/${announcementId}`,
    {
      method: "DELETE"
    }
  );
}
