import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

export const tweets = pgTable("tweets", {
  id: varchar("id").primaryKey(),
  text: varchar("text"),
  retweet: integer("retweet"),
  likes: integer("likes"),
  isReply: boolean("is_reply"),
  isRetweet: boolean("is_retweet"),
  isSelfReply: boolean("is_self_reply"),
  createdAt: timestamp("created_at"),
});

export const tweetRelations = relations(tweets, ({ many }) => ({
  media: many(media),
}));

export const media = pgTable("media", {
  id: varchar("id").primaryKey(),
  tweetId: varchar("tweet_id").references(() => tweets.id, {
    onDelete: "cascade",
    onUpdate: "cascade",
  }),
  previewUrl: varchar("url"),
  type: varchar("type"),
  createdAt: timestamp("created_at"),
});

export const mediaRelations = relations(media, ({ one }) => ({
  tweet: one(tweets, {
    fields: [media.tweetId],
    references: [tweets.id],
  }),
}));
