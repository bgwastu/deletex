"use client";

/* eslint-disable no-var */
/* eslint-disable prefer-const */
import { PGliteWorker } from "@electric-sql/pglite/worker";
import { drizzle, PgliteDatabase } from "drizzle-orm/pglite";
import * as schema from "./schema";

let db: PgliteDatabase<typeof schema> | undefined;
let client: PGliteWorker | undefined;

if (typeof window !== "undefined") {
  if (!client) {
    client = new PGliteWorker(
      new Worker(new URL("../pglite-worker.ts", import.meta.url), {
        type: "module",
      })
    );
  }

  if (!db) {
    db = drizzle(client as any, { schema });
  }
}

export { db, client };

/**
 * Executes the database migration.
 *
 * The query is manually generated by the drizzle-kit since the app is run in a browser.
 */
export async function migrate() {
  // generated by drizzle-kit
  const query = `DO $$ BEGIN
 CREATE TYPE "public"."type" AS ENUM('tweet', 'retweet', 'reply');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media" (
	"id" varchar PRIMARY KEY NOT NULL,
	"tweet_id" varchar,
	"url" varchar,
	"type" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tweets" (
	"id" varchar PRIMARY KEY NOT NULL,
	"text" varchar,
	"retweet" integer,
	"likes" integer,
	"type" "type",
	"created_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media" ADD CONSTRAINT "media_tweet_id_tweets_id_fk" FOREIGN KEY ("tweet_id") REFERENCES "public"."tweets"("id") ON DELETE cascade ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tweet_id_index" ON "media" USING btree ("tweet_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "text_search_index" ON "tweets" USING gin (to_tsvector('english', "text"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "type_index" ON "tweets" USING btree ("type");`;

  await client?.exec(query);
}

/**
 * Delete all tables and remigrate the database.
 */
export async function clear() {
  const query = `DO $$ DECLARE
    r RECORD;
  BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
      EXECUTE 'DROP TABLE IF EXISTS ' || r.tablename || ' CASCADE';
    END LOOP;
  END $$;
  `;
  await client?.exec(query);
  await migrate();
}
