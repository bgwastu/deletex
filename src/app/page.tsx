"use client";

import {
  Anchor,
  Container,
  List,
  rem,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconCheck, IconProgress } from "@tabler/icons-react";

export default function Home() {
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
        <Text>
          Before continuing, you need to import tweets.js file from your X
          archive.{" "}
          <Anchor
            target="_blank"
            href="https://help.x.com/en/managing-your-account/how-to-download-your-x-archive"
          >
            See how to download it
          </Anchor>
          .
        </Text>
      </Stack>
    </Container>
  );
}
