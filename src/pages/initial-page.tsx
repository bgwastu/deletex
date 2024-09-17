"use client";

import DropzoneTweetJs from "@/components/dropzone-tweet-js";
import { db } from "@/database/db";
import { media, TweetMedia, tweets } from "@/database/schema";
import { appStateAtom } from "@/state";
import {
  Container,
  Stack,
  Title,
  Anchor,
  List,
  Text,
  ThemeIcon,
  rem,
  Divider,
  Button,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconProgress } from "@tabler/icons-react";
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
      await db.insert(tweets).values(listTweet).execute();

      // insert media
      const mediaList = listTweet
        .map((tweet) => tweet.media)
        .flat()
        // filter duplicate media
        .filter(
          (media, index, self) =>
            index === self.findIndex((t) => t.id === media.id)
        );
      await db.insert(media).values(mediaList).execute();

      notifications.show({
        title: "Success",
        message: "Tweets imported successfully",
      });
      setAppState("ready");
    } catch (e: any) {
      notifications.show({
        title: "Error",
        message: e.message,
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
          <Title>twt.wastu.net</Title>
          <Text>
            X (formerly Twitter) all-in-one toolkit by{" "}
            <Anchor href="https://x.com/@bgwastu">@bgwastu</Anchor>.
          </Text>
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
            <List.Item>Full-text search for posts</List.Item>
            <List.Item>
              Deleting posts using scripts (no auth/token required)
            </List.Item>
            <List.Item
              icon={
                <ThemeIcon color="gray.6" size={24} radius="xl">
                  <IconProgress style={{ width: rem(16), height: rem(16) }} />
                </ThemeIcon>
              }
              c="gray.6"
            >
              Semantic search posts & likes (planned)
            </List.Item>
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
