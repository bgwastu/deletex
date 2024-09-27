"use client";

import DropzoneTweetJs from "@/components/dropzone-tweet-js";
import { db } from "@/database/db";
import { media, TweetMedia, tweets } from "@/database/schema";
import { appStateAtom } from "@/state";
import {
  Button,
  Container,
  Divider,
  List,
  rem,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck } from "@tabler/icons-react";
import { useSetAtom } from "jotai";
import { useState } from "react";

export default function InitialPage() {
  const [listTweet, setListTweet] = useState<TweetMedia[] | null>(null);
  const [loading, setLoading] = useState(false);
  const setAppState = useSetAtom(appStateAtom);

  async function saveTweetsToDatabase() {
    if (listTweet === null) return;
    setLoading(true);

    try {
      // Chunk tweets for insertion
      const MAX_INSERT_BATCH_SIZE = 1000;
      for (let i = 0; i < listTweet.length; i += MAX_INSERT_BATCH_SIZE) {
        await db
          ?.insert(tweets)
          .values(listTweet.slice(i, i + MAX_INSERT_BATCH_SIZE))
          .execute();
      }

      // insert media
      const mediaList = listTweet
        .map((tweet) => tweet.media)
        .flat()
        // filter duplicate media
        .filter(
          (media, index, self) =>
            index === self.findIndex((t) => t.id === media.id)
        );

      // Chunk media for insertion
      for (let i = 0; i < mediaList.length; i += MAX_INSERT_BATCH_SIZE) {
        await db
          ?.insert(media)
          .values(mediaList.slice(i, i + MAX_INSERT_BATCH_SIZE))
          .execute();
      }

      notifications.show({
        title: "Success",
        message: "Tweets imported successfully",
      });
      setAppState("ready");
    } catch (e: any) {
      console.error("Insertion error:", e);
      notifications.show({
        title: "Error",
        message: "Failed to save data to database. See console for details.",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container component="main" my="xl" size="sm">
      <Stack>
        <Stack gap="xs">
          <Title>DeleteX</Title>
          <Text>Selectively delete your content on X (formerly Twitter).</Text>
        </Stack>
        <Stack gap="xs">
          <Title order={2}>Features</Title>
          <List
            spacing="xs"
            size="sm"
            center
            icon={
              <ThemeIcon color="blue" size={24} radius="xl">
                <IconCheck style={{ width: rem(16), height: rem(16) }} />
              </ThemeIcon>
            }
          >
            <List.Item>
              Deleting content using scripts (no auth/token required)
            </List.Item>
            <List.Item>
              Powerful filtering options (date, media, etc.)
            </List.Item>
            <List.Item>Full-text search</List.Item>
          </List>
        </Stack>
        <Divider my="sm" />
        <DropzoneTweetJs setTweets={setListTweet} tweets={listTweet} />
        {listTweet !== null && (
          <Button size="md" onClick={saveTweetsToDatabase} loading={loading}>
            Continue
          </Button>
        )}
      </Stack>
    </Container>
  );
}
