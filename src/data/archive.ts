import type { TweetMedia, TweetRecord, TweetType } from "./models";

interface ArchiveMedia {
  id_str?: unknown;
  media_url_https?: unknown;
  type?: unknown;
}

interface ArchiveTweet {
  id_str?: unknown;
  full_text?: unknown;
  retweet_count?: unknown;
  favorite_count?: unknown;
  created_at?: unknown;
  in_reply_to_status_id_str?: unknown;
  retweeted_status_id_str?: unknown;
  retweeted_status?: { id_str?: unknown };
  extended_entities?: { media?: ArchiveMedia[] };
}

function requireString(value: unknown, field: string, index: number) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Record ${index + 1} has an invalid ${field}.`);
  }
  return value;
}

function toCount(value: unknown) {
  const count = Number(value ?? 0);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

function decodeArchiveText(value: string) {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    quot: '"',
  };

  return value.replace(/&(?:#(\d+)|#x([\da-f]+)|(amp|apos|gt|lt|quot));/gi, (entity, decimal, hex, named) => {
    if (named) return namedEntities[named.toLowerCase()];

    const codePoint = Number.parseInt(decimal ?? hex, decimal ? 10 : 16);
    try {
      return String.fromCodePoint(codePoint);
    } catch {
      return entity;
    }
  });
}

function parseMedia(value: unknown): TweetMedia[] {
  if (!Array.isArray(value)) return [];

  const result = new Map<string, TweetMedia>();
  for (const item of value as ArchiveMedia[]) {
    if (
      typeof item.id_str === "string" &&
      typeof item.media_url_https === "string" &&
      typeof item.type === "string"
    ) {
      result.set(item.id_str, {
        id: item.id_str,
        previewUrl: item.media_url_https,
        type: item.type,
      });
    }
  }
  return [...result.values()];
}

export function parseTweetArchiveText(source: string): TweetRecord[] {
  const json = source
    .replace(/^\uFEFF?\s*window\.YTD\.tweets\.part\d+\s*=\s*/, "")
    .replace(/;\s*$/, "")
    .trim();

  if (!json) throw new Error("The tweets.js file is empty.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("The selected file is not a valid tweets.js archive.");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("The tweets.js archive must contain a list of posts.");
  }

  const tweets = new Map<string, TweetRecord>();
  parsed.forEach((entry, index) => {
    const tweet = (entry as { tweet?: ArchiveTweet })?.tweet;
    if (!tweet) throw new Error(`Record ${index + 1} does not contain a post.`);

    const id = requireString(tweet.id_str, "post ID", index);
    const text = decodeArchiveText(requireString(tweet.full_text, "post text", index));
    const createdAt = new Date(requireString(tweet.created_at, "date", index));
    if (Number.isNaN(createdAt.getTime())) {
      throw new Error(`Record ${index + 1} has an invalid date.`);
    }

    let type: TweetType = "tweet";
    if (tweet.in_reply_to_status_id_str != null) type = "reply";
    else if (text.startsWith("RT @")) type = "retweet";

    const sourceTweetId =
      typeof tweet.retweeted_status_id_str === "string"
        ? tweet.retweeted_status_id_str
        : typeof tweet.retweeted_status?.id_str === "string"
          ? tweet.retweeted_status.id_str
          : undefined;

    tweets.set(id, {
      id,
      text,
      type,
      sourceTweetId,
      createdAt,
      likes: toCount(tweet.favorite_count),
      retweet: toCount(tweet.retweet_count),
      media: parseMedia(tweet.extended_entities?.media),
    });
  });

  if (tweets.size === 0) {
    throw new Error("The tweets.js archive does not contain any posts.");
  }

  return [...tweets.values()];
}

export async function parseTweetArchive(file: File): Promise<TweetRecord[]> {
  return parseTweetArchiveText(await file.text());
}
