export interface CultureEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  owner: string;
  description: string;
}

export interface NewCultureEventInput {
  title: string;
  date: string;
  time: string;
  location: string;
  owner: string;
  description: string;
}

const CULTURE_EVENTS_STORAGE_KEY = "aveyo-marketing-culture-events-v1";

const seededCultureEvents: CultureEvent[] = [
  {
    id: "seed-quarterly-kickoff",
    title: "Quarterly Kickoff",
    date: "2026-04-15",
    time: "09:30",
    location: "HQ Auditorium + Zoom",
    owner: "Marketing Ops",
    description:
      "Quarterly goals, campaign calendar review, and cross-team planning for launch milestones."
  },
  {
    id: "seed-volunteer-day",
    title: "Community Volunteer Day",
    date: "2026-04-26",
    time: "11:00",
    location: "Downtown Community Center",
    owner: "People Team",
    description:
      "Company-wide volunteer event with partner organizations. Lunch and transportation are provided."
  },
  {
    id: "seed-product-showcase",
    title: "Product & Culture Showcase",
    date: "2026-05-03",
    time: "15:00",
    location: "Main Office, Floor 3",
    owner: "Internal Comms",
    description:
      "Showcase ongoing initiatives, celebrate team wins, and collect feedback for next sprint planning."
  }
];

function normalizeCultureEvent(value: unknown): CultureEvent | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id.trim() : "";
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const date = typeof record.date === "string" ? record.date.trim() : "";
  const time = typeof record.time === "string" ? record.time.trim() : "";
  const location = typeof record.location === "string" ? record.location.trim() : "";
  const owner = typeof record.owner === "string" ? record.owner.trim() : "";
  const description = typeof record.description === "string" ? record.description.trim() : "";

  if (!id || !title || !date || !time || !location || !owner || !description) {
    return null;
  }

  return {
    id,
    title,
    date,
    time,
    location,
    owner,
    description
  };
}

function sortEvents(events: CultureEvent[]): CultureEvent[] {
  return [...events].sort((left, right) => {
    const leftTime = Date.parse(`${left.date}T${left.time}`);
    const rightTime = Date.parse(`${right.date}T${right.time}`);
    if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) {
      return left.title.localeCompare(right.title);
    }
    return leftTime - rightTime;
  });
}

function readStoredCultureEvents(): CultureEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CULTURE_EVENTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((event) => normalizeCultureEvent(event))
      .filter((event): event is CultureEvent => event !== null);
  } catch {
    return [];
  }
}

function writeStoredCultureEvents(events: CultureEvent[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(CULTURE_EVENTS_STORAGE_KEY, JSON.stringify(events));
}

export function readCultureEvents(): CultureEvent[] {
  return sortEvents([...seededCultureEvents, ...readStoredCultureEvents()]);
}

export function createCultureEvent(input: NewCultureEventInput): CultureEvent {
  const event: CultureEvent = {
    id: `event-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    title: input.title.trim(),
    date: input.date.trim(),
    time: input.time.trim(),
    location: input.location.trim(),
    owner: input.owner.trim(),
    description: input.description.trim()
  };

  const storedEvents = readStoredCultureEvents();
  writeStoredCultureEvents([...storedEvents, event]);
  return event;
}
