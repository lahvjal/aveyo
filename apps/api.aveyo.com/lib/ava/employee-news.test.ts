import { beforeEach, describe, expect, it, vi } from "vitest";
import { lookupEmployeeNewsContext } from "@/lib/ava/employee-news";
import { listMarketingNewsPosts } from "@/lib/marketing/news";

vi.mock("@/lib/marketing/news", () => ({
  listMarketingNewsPosts: vi.fn()
}));

const mockedListMarketingNewsPosts = vi.mocked(listMarketingNewsPosts);

describe("lookupEmployeeNewsContext", () => {
  beforeEach(() => {
    mockedListMarketingNewsPosts.mockReset();
  });

  it("returns employee-visible news summaries", async () => {
    mockedListMarketingNewsPosts.mockResolvedValue({
      posts: [
        {
          id: "news-1",
          title: "Quarterly Kickoff",
          slug: "quarterly-kickoff",
          category: "Company",
          excerpt: "Kickoff is scheduled for next Friday.",
          heroImageUrl: null,
          publishedAt: "2026-01-10T12:00:00.000Z",
          createdAt: "2026-01-09T12:00:00.000Z",
          updatedAt: "2026-01-10T12:00:00.000Z"
        }
      ],
      categories: ["Company"],
      page: 1,
      pageSize: 3,
      total: 1,
      hasMore: false,
      scope: "published"
    });

    const result = await lookupEmployeeNewsContext("What company updates are new?");

    expect(result.status).toBe("ok");
    expect(result.posts).toEqual([
      {
        title: "Quarterly Kickoff",
        category: "Company",
        excerpt: "Kickoff is scheduled for next Friday.",
        slug: "quarterly-kickoff",
        publishedAt: "2026-01-10T12:00:00.000Z"
      }
    ]);
  });
});
