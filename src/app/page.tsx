"use client";

import DropzoneTweetJs from "@/components/dropzone-tweet-js";
import { clear, db } from "@/database/db";
import { Tweet, TweetMedia, tweets } from "@/database/schema";
import {
  Anchor,
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
import { IconCheck, IconProgress } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { media } from "@/database/schema";
import { notifications } from "@mantine/notifications";

export default function Home() {
  useEffect(() => {
    (async () => {
      await clear();
    })();
  }, []);
  const [listTweet, setListTweet] = useState<TweetMedia[] | null>(null);

  async function saveTweetsToDatabase() {
    if (listTweet === null) return;

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
    } catch (e: any) {
      notifications.show({
        title: "Error",
        message: e.message,
        color: "red",
      });
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
            >
              Semantic search posts & likes (planned)
            </List.Item>
          </List>
        </Stack>
        <Divider my="sm" />
        <DropzoneTweetJs setTweets={setListTweet} tweets={listTweet} />
        {listTweet !== null && (
          <Button size="md" onClick={saveTweetsToDatabase}>
            Continue
          </Button>
        )}
      </Stack>
    </Container>
  );
}
