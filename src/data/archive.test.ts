import { describe, expect, it } from "vitest";
import { parseTweetArchiveText } from "./archive";

function archive(tweet: Record<string, unknown>) {
  return `window.YTD.tweets.part0 = ${JSON.stringify([{ tweet }])}`;
}

const validTweet = {
  id_str: "123",
  full_text: "Hello from the archive",
  retweet_count: "4",
  favorite_count: "7",
  created_at: "Wed Oct 10 20:19:24 +0000 2018",
};

describe("parseTweetArchiveText", () => {
  it("parses an X archive assignment", () => {
    const [tweet] = parseTweetArchiveText(archive(validTweet));
    expect(tweet).toMatchObject({
      id: "123",
      text: "Hello from the archive",
      retweet: 4,
      likes: 7,
      type: "tweet",
      media: [],
    });
    expect(tweet.createdAt).toBeInstanceOf(Date);
  });

  it("accepts BOM, whitespace, another part number, and a semicolon", () => {
    const source = `\uFEFF  window.YTD.tweets.part12 = ${JSON.stringify([{ tweet: validTweet }])}; `;
    expect(parseTweetArchiveText(source)).toHaveLength(1);
  });

  it("classifies replies before reposts", () => {
    const [tweet] = parseTweetArchiveText(
      archive({ ...validTweet, full_text: "RT @person: text", in_reply_to_status_id_str: "1" }),
    );
    expect(tweet.type).toBe("reply");
  });

  it("decodes HTML entities in archive text", () => {
    const [tweet] = parseTweetArchiveText(
      archive({ ...validTweet, full_text: "Before &amp; after: &#39;safe&#39; &lt;3" }),
    );
    expect(tweet.text).toBe("Before & after: 'safe' <3");
  });

  it("deduplicates repeated IDs", () => {
    const source = JSON.stringify([{ tweet: validTweet }, { tweet: validTweet }]);
    expect(parseTweetArchiveText(source)).toHaveLength(1);
  });

  it("rejects empty and malformed archives with actionable errors", () => {
    expect(() => parseTweetArchiveText("[]")).toThrow("does not contain any posts");
    expect(() => parseTweetArchiveText("not json")).toThrow("not a valid tweets.js archive");
  });
});
