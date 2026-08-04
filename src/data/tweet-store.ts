import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  DeletionTarget,
  TweetCriteria,
  TweetCursor,
  TweetPage,
  TweetRecord,
} from "./models";

const DATABASE_NAME = "deletex";
const LEGACY_DATABASE_NAME = "twt-data";

interface DeleteXDatabase extends DBSchema {
  tweets: {
    key: string;
    value: TweetRecord;
    indexes: { "by-createdAt-id": [Date, string] };
  };
}

let databasePromise: Promise<IDBPDatabase<DeleteXDatabase>> | null = null;
let isDeletingDatabase = false;

function getDatabase() {
  if (isDeletingDatabase) {
    throw new Error("Local storage is currently being removed.");
  }
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available in this browser.");
  }

  databasePromise ??= openDB<DeleteXDatabase>(DATABASE_NAME, 1, {
    upgrade(database) {
      const store = database.createObjectStore("tweets", { keyPath: "id" });
      store.createIndex("by-createdAt-id", ["createdAt", "id"]);
    },
    blocking() {
      const activeDatabase = databasePromise;
      databasePromise = null;
      void activeDatabase?.then((database) => database.close());
    },
  });
  return databasePromise;
}

export async function initializeTweetStore() {
  await getDatabase();
}

export async function countTweets() {
  return (await getDatabase()).count("tweets");
}

export async function replaceTweets(tweets: readonly TweetRecord[]) {
  if (tweets.length === 0) throw new Error("Cannot import an empty archive.");

  const database = await getDatabase();
  const transaction = database.transaction("tweets", "readwrite");
  await transaction.store.clear();
  for (const tweet of tweets) await transaction.store.put(tweet);
  await transaction.done;
}

function normalizedTokens(value: string) {
  return value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .split(/[^\p{L}\p{N}_]+/u)
    .filter(Boolean);
}

function matches(tweet: TweetRecord, criteria: TweetCriteria) {
  const { filters } = criteria;
  if (filters.tweetType.length > 0 && !filters.tweetType.includes(tweet.type)) {
    return false;
  }
  if (filters.minLikes != null && tweet.likes < filters.minLikes) return false;
  if (filters.maxLikes != null && tweet.likes > filters.maxLikes) return false;
  if (filters.minRetweet != null && tweet.retweet < filters.minRetweet) return false;
  if (filters.maxRetweet != null && tweet.retweet > filters.maxRetweet) return false;
  if (filters.containsMedia && tweet.media.length === 0) return false;

  if (filters.startDate) {
    const start = new Date(`${filters.startDate}T00:00:00`);
    if (tweet.createdAt < start) return false;
  }
  if (filters.endDate) {
    const endExclusive = new Date(`${filters.endDate}T00:00:00`);
    endExclusive.setDate(endExclusive.getDate() + 1);
    if (tweet.createdAt >= endExclusive) return false;
  }

  const queryTokens = normalizedTokens(criteria.query);
  if (queryTokens.length > 0) {
    const text = tweet.text.normalize("NFKD").toLocaleLowerCase();
    if (!queryTokens.every((token) => text.includes(token))) return false;
  }
  return true;
}

async function matchingTweets(criteria: TweetCriteria) {
  const database = await getDatabase();
  const result: TweetRecord[] = [];
  let cursor = await database
    .transaction("tweets")
    .store.index("by-createdAt-id")
    .openCursor(null, "prev");

  while (cursor) {
    if (matches(cursor.value, criteria)) result.push(cursor.value);
    cursor = await cursor.continue();
  }
  return result;
}

function isAfterCursor(tweet: TweetRecord, cursor: TweetCursor) {
  const time = tweet.createdAt.getTime();
  const cursorTime = cursor.createdAt.getTime();
  return time < cursorTime || (time === cursorTime && tweet.id < cursor.id);
}

function paginateTweets(
  tweets: TweetRecord[],
  options: { cursor?: TweetCursor | null; limit?: number },
): TweetPage {
  const eligible = options.cursor
    ? tweets.filter((tweet) => isAfterCursor(tweet, options.cursor!))
    : tweets;
  const limit = options.limit ?? 20;
  const items = eligible.slice(0, limit);
  const last = items.at(-1);

  return {
    items,
    total: tweets.length,
    hasMore: eligible.length > items.length,
    nextCursor: last ? { createdAt: last.createdAt, id: last.id } : null,
  };
}

export async function queryTweets(
  criteria: TweetCriteria,
  options: { cursor?: TweetCursor | null; limit?: number } = {},
): Promise<TweetPage> {
  const all = await matchingTweets(criteria);
  return paginateTweets(all, options);
}

export async function queryTweetsByIds(
  ids: readonly string[],
  options: { cursor?: TweetCursor | null; limit?: number } = {},
): Promise<TweetPage> {
  const database = await getDatabase();
  const tweets = (await Promise.all(ids.map((id) => database.get("tweets", id))))
    .filter((tweet): tweet is TweetRecord => tweet != null)
    .sort((a, b) => {
      const dateOrder = b.createdAt.getTime() - a.createdAt.getTime();
      return dateOrder || b.id.localeCompare(a.id);
    });
  return paginateTweets(tweets, options);
}

export async function getMatchingDeletionTargets(
  criteria: TweetCriteria,
): Promise<DeletionTarget[]> {
  return (await matchingTweets(criteria)).map(({ id, type, sourceTweetId }) => ({
    id,
    type,
    sourceTweetId,
  }));
}

export async function clearAllLocalData() {
  isDeletingDatabase = true;
  try {
    if (databasePromise) {
      const database = await databasePromise;
      database.close();
      databasePromise = null;
    }
    const remove = async (name: string) => {
      let timeout: ReturnType<typeof setTimeout>;
      try {
        await Promise.race([
          deleteDB(name),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(
              () => reject(new Error(`Timed out while deleting ${name}.`)),
              10_000,
            );
          }),
        ]);
      } finally {
        clearTimeout(timeout!);
      }
    };
    await remove(DATABASE_NAME);
    await remove(LEGACY_DATABASE_NAME);
  } finally {
    isDeletingDatabase = false;
  }
}

export async function hasLegacyPGliteData() {
  if (typeof indexedDB.databases !== "function") return false;
  return (await indexedDB.databases()).some(
    (database) => database.name === LEGACY_DATABASE_NAME,
  );
}

export async function clearLegacyPGliteData() {
  let timeout: ReturnType<typeof setTimeout>;
  try {
    await Promise.race([
      deleteDB(LEGACY_DATABASE_NAME),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Timed out while deleting the legacy archive.")),
          10_000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout!);
  }
}
