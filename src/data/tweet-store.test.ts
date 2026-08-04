import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import type { TweetCriteria, TweetRecord } from "./models";
import {
  clearAllLocalData,
  countTweets,
  getMatchingDeletionTargets,
  hasLegacyPGliteData,
  queryTweets,
  queryTweetsByIds,
  replaceTweets,
} from "./tweet-store";

const criteria: TweetCriteria = {
  query: "",
  filters: {
    tweetType: [],
    startDate: null,
    endDate: null,
    minLikes: null,
    maxLikes: null,
    minRetweet: null,
    maxRetweet: null,
    containsMedia: false,
  },
};

function tweet(id: string, date: Date, overrides: Partial<TweetRecord> = {}): TweetRecord {
  return {
    id,
    text: `Post ${id}`,
    retweet: 0,
    likes: 0,
    type: "tweet",
    createdAt: date,
    media: [],
    ...overrides,
  };
}

beforeEach(async () => {
  await clearAllLocalData();
});

describe("tweet store", () => {
  it("atomically replaces and clears the local archive", async () => {
    await replaceTweets([tweet("1", new Date("2026-01-01"))]);
    expect(await countTweets()).toBe(1);
    await clearAllLocalData();
    expect(await countTweets()).toBe(0);
  });

  it("keeps totals stable across pages and does not lose an exact second page", async () => {
    const records = Array.from({ length: 40 }, (_, index) =>
      tweet(String(index).padStart(2, "0"), new Date(2026, 0, 40 - index)),
    );
    await replaceTweets(records);

    const first = await queryTweets(criteria, { limit: 20 });
    const second = await queryTweets(criteria, { limit: 20, cursor: first.nextCursor });
    expect(first.total).toBe(40);
    expect(second.total).toBe(40);
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(20);
    expect(new Set([...first.items, ...second.items].map((item) => item.id)).size).toBe(40);
    expect(second.hasMore).toBe(false);
  });

  it("uses ID as a stable tie-breaker for equal timestamps", async () => {
    const date = new Date("2026-01-01T00:00:00Z");
    await replaceTweets([tweet("1", date), tweet("2", date), tweet("3", date)]);
    const first = await queryTweets(criteria, { limit: 2 });
    const second = await queryTweets(criteria, { limit: 2, cursor: first.nextCursor });
    expect([...first.items, ...second.items].map((item) => item.id)).toEqual(["3", "2", "1"]);
  });

  it("applies search, filters, and full-day end dates consistently", async () => {
    await replaceTweets([
      tweet("1", new Date("2026-02-10T23:30:00"), {
        text: "Halo dunia",
        likes: 10,
        type: "reply",
        media: [{ id: "m1", previewUrl: "https://example.com/1.jpg", type: "photo" }],
      }),
      tweet("2", new Date("2026-02-11T00:01:00"), { text: "Halo lagi", likes: 10 }),
    ]);

    const filtered = await queryTweets({
      query: "HALO dunia",
      filters: {
        ...criteria.filters,
        tweetType: ["reply"],
        endDate: "2026-02-10",
        minLikes: 10,
        containsMedia: true,
      },
    });
    expect(filtered.items.map((item) => item.id)).toEqual(["1"]);
  });

  it("returns deletion metadata for every matching record", async () => {
    await replaceTweets([
      tweet("1", new Date("2026-01-01"), {
        type: "retweet",
        sourceTweetId: "source-1",
      }),
    ]);
    expect(await getMatchingDeletionTargets(criteria)).toEqual([
      { id: "1", type: "retweet", sourceTweetId: "source-1" },
    ]);
  });

  it("paginates a stable selected-ID basket in archive order", async () => {
    await replaceTweets([
      tweet("1", new Date("2026-01-01")),
      tweet("2", new Date("2026-01-02")),
      tweet("3", new Date("2026-01-03")),
    ]);
    const first = await queryTweetsByIds(["1", "3"], { limit: 1 });
    const second = await queryTweetsByIds(["1", "3"], {
      limit: 1,
      cursor: first.nextCursor,
    });
    expect(first.items.map((item) => item.id)).toEqual(["3"]);
    expect(second.items.map((item) => item.id)).toEqual(["1"]);
    expect(second.total).toBe(2);
  });

  it("detects and removes legacy PGlite storage", async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("twt-data", 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
    });
    expect(await hasLegacyPGliteData()).toBe(true);
    await clearAllLocalData();
    expect(await hasLegacyPGliteData()).toBe(false);
  });
});
