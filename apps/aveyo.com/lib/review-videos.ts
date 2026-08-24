export interface PublicReviewVideo {
  id: string;
  title: string;
  publishedAt: string;
}

const AVEYO_YOUTUBE_CHANNEL_ID = "UCtTnoI1eAJf-iTq89H4Dw_A";
const AVEYO_YOUTUBE_UPLOADS_PLAYLIST_ID = "UUtTnoI1eAJf-iTq89H4Dw_A";
const AVEYO_YOUTUBE_VIDEOS_URL = "https://www.youtube.com/@Aveyohome/videos";
const REVIEW_VIDEO_TITLE_TEXT = "a real aveyo customer";
const YOUTUBE_REVIEW_VIDEOS_CACHE_TAG = "youtube-review-videos";

// Keeps the gallery available if YouTube temporarily rejects or rate-limits the
// server-side request. Dynamic results replace these as soon as YouTube responds.
const FALLBACK_REVIEW_VIDEOS: PublicReviewVideo[] = [
  { id: "c8dyX-24GzA", title: "A REAL AVEYO CUSTOMER | BARB", publishedAt: "" },
  { id: "OYnfSUqTnr4", title: "A REAL AVEYO CUSTOMER | MIKE", publishedAt: "" },
  { id: "e2_TdeCr1JU", title: "A REAL AVEYO CUSTOMER | THE MACHENS", publishedAt: "" },
  { id: "vb4JwgpCF6Y", title: "A REAL AVEYO CUSTOMER | THE SAUTERS", publishedAt: "" },
  { id: "TAK5SvKJ4Ug", title: "A REAL AVEYO CUSTOMER | SHERI", publishedAt: "" },
  { id: "WIoAcbuFNMM", title: "A REAL AVEYO CUSTOMER | THE EVERAGES", publishedAt: "" },
  { id: "__V8mWAIUeY", title: "A REAL AVEYO CUSTOMER | DAMON", publishedAt: "" },
  { id: "-7bJa1-Lc5Y", title: "A REAL AVEYO CUSTOMER | DANIEL", publishedAt: "" },
  { id: "442Fj3DXzTk", title: "A REAL AVEYO CUSTOMER | LARRY", publishedAt: "" }
];

function isReviewVideoTitle(title: string) {
  return title.toLocaleLowerCase().includes(REVIEW_VIDEO_TITLE_TEXT);
}

function uniqueVideos(videos: PublicReviewVideo[]) {
  const seen = new Set<string>();
  return videos.filter((video) => {
    if (!video.id || seen.has(video.id) || !isReviewVideoTitle(video.title)) {
      return false;
    }
    seen.add(video.id);
    return true;
  });
}

interface YouTubePlaylistResponse {
  nextPageToken?: string;
  items?: Array<{
    snippet?: {
      title?: string;
      publishedAt?: string;
      resourceId?: { videoId?: string };
    };
  }>;
}

async function getVideosFromYouTubeDataApi(apiKey: string) {
  const videos: PublicReviewVideo[] = [];
  let pageToken = "";

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("playlistId", AVEYO_YOUTUBE_UPLOADS_PLAYLIST_ID);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url, {
      cache: "force-cache",
      next: { tags: [YOUTUBE_REVIEW_VIDEOS_CACHE_TAG] }
    });
    if (!response.ok) {
      throw new Error(`YouTube Data API returned ${response.status}.`);
    }

    const payload = (await response.json()) as YouTubePlaylistResponse;
    for (const item of payload.items ?? []) {
      const id = item.snippet?.resourceId?.videoId?.trim() ?? "";
      const title = item.snippet?.title?.trim() ?? "";
      if (id && isReviewVideoTitle(title)) {
        videos.push({
          id,
          title,
          publishedAt: item.snippet?.publishedAt ?? ""
        });
      }
    }

    pageToken = payload.nextPageToken ?? "";
  } while (pageToken);

  return uniqueVideos(videos);
}

function extractInitialData(html: string): unknown {
  const markers = ["var ytInitialData = ", "window[\"ytInitialData\"] = "];
  const marker = markers.find((candidate) => html.includes(candidate));
  if (!marker) {
    throw new Error("YouTube channel data was not present in the page.");
  }

  const start = html.indexOf(marker) + marker.length;
  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let index = start; index < html.length; index += 1) {
    const character = html[index];
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (character === "\\") {
        isEscaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(html.slice(start, index + 1)) as unknown;
      }
    }
  }

  throw new Error("YouTube channel data was incomplete.");
}

function collectVideosFromInitialData(initialData: unknown) {
  const videos: PublicReviewVideo[] = [];

  function visit(value: unknown) {
    if (!value || typeof value !== "object") {
      return;
    }

    const record = value as Record<string, unknown>;
    const metadata = record.metadata as Record<string, unknown> | undefined;
    const lockup = metadata?.lockupMetadataViewModel as Record<string, unknown> | undefined;
    const titleModel = lockup?.title as Record<string, unknown> | undefined;
    const lockupTitle = typeof titleModel?.content === "string" ? titleModel.content.trim() : "";
    const lockupId = typeof record.contentId === "string" ? record.contentId.trim() : "";

    const legacyRenderer = (record.gridVideoRenderer ?? record.videoRenderer) as
      | Record<string, unknown>
      | undefined;
    const legacyTitleModel = legacyRenderer?.title as
      | { simpleText?: string; runs?: Array<{ text?: string }> }
      | undefined;
    const legacyTitle =
      legacyTitleModel?.simpleText?.trim() ?? legacyTitleModel?.runs?.[0]?.text?.trim() ?? "";
    const legacyId =
      typeof legacyRenderer?.videoId === "string" ? legacyRenderer.videoId.trim() : "";

    const id = lockupId || legacyId;
    const title = lockupTitle || legacyTitle;
    if (id && isReviewVideoTitle(title)) {
      videos.push({ id, title, publishedAt: "" });
    }

    for (const child of Object.values(record)) {
      visit(child);
    }
  }

  visit(initialData);
  return uniqueVideos(videos);
}

async function getVideosFromYouTubeChannelPage() {
  const response = await fetch(AVEYO_YOUTUBE_VIDEOS_URL, {
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent":
        "Mozilla/5.0 (compatible; AveyoReviews/1.0; +https://www.aveyo.com/reviews)"
    },
    cache: "force-cache",
    next: { tags: [YOUTUBE_REVIEW_VIDEOS_CACHE_TAG] }
  });
  if (!response.ok) {
    throw new Error(`YouTube channel page returned ${response.status}.`);
  }

  return collectVideosFromInitialData(extractInitialData(await response.text()));
}

export async function getPublicReviewVideos(): Promise<PublicReviewVideo[]> {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();

  if (apiKey) {
    try {
      const apiVideos = await getVideosFromYouTubeDataApi(apiKey);
      if (apiVideos.length > 0) {
        return apiVideos;
      }
    } catch {
      // Fall through to the keyless channel-page request.
    }
  }

  try {
    const channelVideos = await getVideosFromYouTubeChannelPage();
    return channelVideos.length > 0 ? channelVideos : FALLBACK_REVIEW_VIDEOS;
  } catch {
    return FALLBACK_REVIEW_VIDEOS;
  }
}

export {
  AVEYO_YOUTUBE_CHANNEL_ID,
  AVEYO_YOUTUBE_VIDEOS_URL,
  YOUTUBE_REVIEW_VIDEOS_CACHE_TAG
};
