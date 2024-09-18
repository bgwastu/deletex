import { InferSelectModel, relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const typeEnum = pgEnum("type", ["tweet", "retweet", "reply"]);
export type TweetType = "tweet" | "retweet" | "reply";

export const tweets = pgTable("tweets", {
  id: varchar("id").primaryKey(),
  text: varchar("text"),
  retweet: integer("retweet"),
  likes: integer("likes"),
  type: typeEnum("type"),
  createdAt: timestamp("created_at"),
});

export const tweetRelations = relations(tweets, ({ many }) => ({
  media: many(media),
}));

export type Tweet = InferSelectModel<typeof tweets>;
export type TweetMedia = Tweet & { media: Media[] };

export const media = pgTable("media", {
  id: varchar("id").primaryKey(),
  tweetId: varchar("tweet_id").references(() => tweets.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  previewUrl: varchar("url"),
  type: varchar("type"),
});

export const mediaRelations = relations(media, ({ one }) => ({
  tweet: one(tweets, {
    fields: [media.tweetId],
    references: [tweets.id],
  }),
}));

export type Media = InferSelectModel<typeof media>;
