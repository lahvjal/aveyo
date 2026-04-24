import { authApiRequest } from "@/lib/auth/session";

export type CulturePosterKind = "image" | "video";

export interface CultureEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  owner: string;
  description: string;
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

export interface NewCultureEventInput {
  title: string;
  date: string;
  time: string;
  location: string;
  owner: string;
  description: string;
  posterKind?: CulturePosterKind | "";
  posterUrl?: string;
  posterFile?: File | null;
}

export interface NewCultureAnnouncementInput {
  title: string;
  message: string;
  authorName: string;
}

function buildCultureEventPayload(input: NewCultureEventInput) {
  return {
    title: input.title,
    date: input.date,
    time: input.time,
    location: input.location,
    owner: input.owner,
    description: input.description,
    posterKind: input.posterKind?.trim() ? input.posterKind : undefined,
    posterUrl: input.posterUrl?.trim() ? input.posterUrl.trim() : undefined
  };
}

function buildCultureEventFormData(input: NewCultureEventInput) {
  const formData = new FormData();
  const payload = buildCultureEventPayload(input);

  formData.set("title", payload.title);
  formData.set("date", payload.date);
  formData.set("time", payload.time);
  formData.set("location", payload.location);
  formData.set("owner", payload.owner);
  formData.set("description", payload.description);

  if (payload.posterKind) {
    formData.set("posterKind", payload.posterKind);
  }

  if (payload.posterUrl) {
    formData.set("posterUrl", payload.posterUrl);
  }

  if (input.posterFile) {
    formData.set("posterFile", input.posterFile);
  }

  return formData;
}

function buildCultureEventRequestBody(input: NewCultureEventInput) {
  return input.posterFile ? buildCultureEventFormData(input) : JSON.stringify(buildCultureEventPayload(input));
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
