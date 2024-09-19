"use client";

import { TweetMedia } from "@/database/schema";
import { css } from "@/styled-system/css";
import {
  Anchor,
  Box,
  Button,
  Center,
  Checkbox,
  Container,
  Flex,
  Group,
  Image,
  Input,
  Loader,
  MultiSelect,
  NumberInput,
  Popover,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { usePagination } from "@mantine/hooks";
import {
  IconArticle,
  IconFilter,
  IconHeart,
  IconHeartFilled,
  IconMessage,
  IconRepeat,
} from "@tabler/icons-react";
import { eq, or } from "drizzle-orm";
import { useEffect, useRef, useState } from "react";

const PAGE_SIZE = 20;

export default function SearchPage() {
  const [loading, setLoading] = useState(true);
  const [listTweet, setListTweet] = useState<TweetMedia[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const pagination = usePagination({ total: 10, initialPage: 1 });

  const [selectedTweetId, setSelectedTweetId] = useState<string[]>([]);

  const form = useForm({
    initialValues: {
      tweetType: ["tweet", "retweet", "reply"] as (
        | "retweet"
        | "tweet"
        | "reply"
      )[],
      startDate: null as Date | null,
      endDate: null as Date | null,
      minLikes: 0,
      minRetweet: 0,
    },
    validate: {
      startDate: (value) => {
        if (value && form.values.endDate && value > form.values.endDate) {
          return "Start date must be before end date";
        }
        return null;
      },
      endDate: (value) => {
        if (value && form.values.startDate && value < form.values.startDate) {
          return "End date must be after start date";
        }
        return null;
      },
    },
  });

  useEffect(function initial() {
    getListTweet(1).then((res) => {
      if (res) setListTweet(res);
      setLoading(false);
    });
  }, []);

  async function getListTweet(page: number) {
    setLoading(true);
    const res = await db?.query.tweets.findMany({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      with: {
        media: true,
      },
      where: (
        tweets,
        { and, gte, lte } // Added 'lte' here
      ) =>
        and(
          gte(tweets.likes, form.values.minLikes),
          gte(tweets.retweet, form.values.minRetweet),
          form.values.startDate
            ? gte(tweets.createdAt, form.values.startDate)
            : and(),
          form.values.endDate
            ? lte(tweets.createdAt, form.values.endDate) // Changed 'gte' to 'lte' for endDate
            : and(),
          form.values.tweetType.length > 0
            ? or(...form.values.tweetType.map((type) => eq(tweets.type, type)))
            : and()
        ),
      orderBy: (tweets, { desc }) => [desc(tweets.createdAt)],
    });
    return res;
  }

  async function selectAll() {
    const tweetIds = await db?.query.tweets.findMany({
      columns: {
        id: true,
      },
      where: (
        tweets,
        { and, gte, lte } // Added 'lte' here
      ) =>
        and(
          gte(tweets.likes, form.values.minLikes),
          gte(tweets.retweet, form.values.minRetweet),
          form.values.startDate
            ? gte(tweets.createdAt, form.values.startDate)
            : and(),
          form.values.endDate
            ? lte(tweets.createdAt, form.values.endDate) // Changed 'gte' to 'lte' for endDate
            : and(),
          form.values.tweetType.length > 0
            ? or(...form.values.tweetType.map((type) => eq(tweets.type, type)))
            : and()
        ),
      orderBy: (tweets, { desc }) => [desc(tweets.createdAt)],
    });

    if (!tweetIds) return;

    setSelectedTweetId(tweetIds.map((tweet) => tweet.id));
    setIsSelectAll(true);
  }

  function clearAll() {
    setIsSelectAll(false);
    setSelectedTweetId([]);
  }

  async function loadMore() {
    setLoading(true);
    pagination.next();
    const res = await getListTweet(pagination.active + 1);
    if (res) setListTweet([...listTweet, ...res]);
    setLoading(false);
  }

  async function applyFilter() {
    pagination.setPage(1);
    const res = await getListTweet(1);
    if (res) setListTweet(res);
    setLoading(false);
  }

  return (
    <>
      <Container my="xl">
        <Stack>
          <Title ta="center">twt.wastu.net</Title>
          <Stack>
            <Flex gap="sm">
              <TextInput size="md" placeholder="Search posts..." flex={1} />
              <Popover
                width={400}
                trapFocus
                withArrow
                shadow="md"
                clickOutsideEvents={[]}
              >
                <Popover.Target>
                  <Button size="md" leftSection={<IconFilter size={14} />}>
                    Filter
                  </Button>
                </Popover.Target>
                <Popover.Dropdown>
                  <form onSubmit={form.onSubmit(applyFilter)}>
                    <Stack>
                      <MultiSelect
                        label="Post Type"
                        data={[
                          { value: "tweet", label: "Post" },
                          { value: "retweet", label: "Repost" },
                          { value: "reply", label: "Reply" },
                        ]}
                        clearable
                        size="sm"
                        {...form.getInputProps("tweetType")}
                      />
                      <Stack gap="xs">
                        <Input.Wrapper label="Date Range">
                          <Group gap="sm" grow>
                            <DatePickerInput
                              placeholder="From"
                              clearable
                              {...form.getInputProps("startDate")}
                            />
                            <DatePickerInput
                              placeholder="To"
                              clearable
                              {...form.getInputProps("endDate")}
                            />
                          </Group>
                        </Input.Wrapper>
                      </Stack>
                      <NumberInput
                        label="Minimum likes"
                        min={0}
                        step={1}
                        leftSection={<IconHeart size={14} />}
                        hideControls
                        {...form.getInputProps("minLikes")}
                      />
                      <NumberInput
                        label="Minimum repost"
                        min={0}
                        step={1}
                        leftSection={<IconRepeat size={14} />}
                        hideControls
                        {...form.getInputProps("minRetweet")}
                      />
                      <Button type="submit">Apply Filters</Button>
                    </Stack>
                  </form>
                </Popover.Dropdown>
              </Popover>
            </Flex>
            {selectedTweetId.length > 0 && (
              <Flex align="center" gap="sm">
                <Button onClick={isSelectAll ? clearAll : selectAll}>
                  {isSelectAll ? "Unselect all" : "Select all"}
                </Button>
                <Text
                  c="dimmed"
                  size="sm"
                >{`Selected: ${selectedTweetId.length}`}</Text>
              </Flex>
            )}
          </Stack>
          <Stack ref={containerRef}>
            {listTweet.map((tweet) => {
              return (
                <Checkbox.Card
                  py="md"
                  px="sm"
                  className={css({
                    transition: "border-color 150ms ease",
                    "&[data-checked]": {
                      borderColor: "var(--mantine-primary-color-filled)!",
                    },
                  })}
                  value={tweet.id}
                  key={tweet.id}
                  checked={selectedTweetId.includes(tweet.id)}
                  onClick={() => {
                    if (selectedTweetId.includes(tweet.id)) {
                      setSelectedTweetId((prev) =>
                        prev.filter((id) => id !== tweet.id)
                      );
                    } else {
                      setSelectedTweetId((prev) => [...prev, tweet.id]);
                    }
                  }}
                  bg="white"
                >
                  <Flex gap="sm">
                    <Checkbox.Indicator mt={4} />
                    <Stack w="100%" gap="xs">
                      <Flex justify="space-between">
                        {tweet.type === "retweet" && (
                          <Flex gap={2} align="center">
                            <ThemeIcon variant="white" size="md" c="green.6">
                              <IconRepeat
                                style={{ width: "70%", height: "70%" }}
                              />
                            </ThemeIcon>
                            <Text size="sm" c="dimmed">
                              Repost
                            </Text>
                          </Flex>
                        )}
                        {tweet.type === "reply" && (
                          <Flex gap={2} align="center">
                            <ThemeIcon variant="white" size="md" c="blue.6">
                              <IconMessage
                                style={{ width: "70%", height: "70%" }}
                              />
                            </ThemeIcon>
                            <Text size="sm" c="dimmed">
                              Reply
                            </Text>
                          </Flex>
                        )}
                        {tweet.type === "tweet" && (
                          <Flex gap={2} align="center">
                            <ThemeIcon variant="white" size="md" c="dimmed">
                              <IconArticle
                                style={{ width: "70%", height: "70%" }}
                              />
                            </ThemeIcon>
                            <Text size="sm" c="dimmed">
                              Post
                            </Text>
                          </Flex>
                        )}
                        <Anchor
                          href={`https://x.com/i/web/status/${tweet.id}`}
                          fz="sm"
                          c="dimmed"
                          target="_blank"
                        >
                          {tweet.createdAt?.toLocaleDateString()}{" "}
                          {tweet.createdAt?.toLocaleString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Anchor>
                      </Flex>
                      <Text>{tweet.text}</Text>
                      {tweet.media && tweet.media.length > 0 && (
                        <SimpleGrid
                          spacing="sm"
                          cols={{
                            base: 1,
                            sm: 2,
                            md: 3,
                          }}
                        >
                          {tweet.media.map((mediaItem, index) => (
                            <Box key={index}>
                              {mediaItem.type === "photo" && (
                                <Image
                                  src={mediaItem.previewUrl}
                                  alt={`media-${index}`}
                                />
                              )}
                              {mediaItem.type === "video" && (
                                <video controls>
                                  <source
                                    src={mediaItem.previewUrl ?? ""}
                                    type="video/mp4"
                                  />
                                  Your browser does not support the video tag.
                                </video>
                              )}
                            </Box>
                          ))}
                        </SimpleGrid>
                      )}
                      <Group gap="xs">
                        <Flex gap={2} align="center">
                          <ThemeIcon variant="white" size="sm" c="dimmed">
                            <IconHeartFilled
                              style={{ width: "70%", height: "70%" }}
                            />
                          </ThemeIcon>
                          <Text fz="sm" c="dimmed">
                            {tweet.likes}
                          </Text>
                        </Flex>
                        <Flex gap={2} align="center">
                          <ThemeIcon variant="white" size="sm" c="dimmed">
                            <IconRepeat
                              style={{ width: "70%", height: "70%" }}
                            />
                          </ThemeIcon>
                          <Text fz="sm" c="dimmed">
                            {tweet.retweet}
                          </Text>
                        </Flex>
                      </Group>
                    </Stack>
                  </Flex>
                </Checkbox.Card>
              );
            })}
          </Stack>
          {loading ? (
            <Center>
              <Loader />
            </Center>
          ) : (
            <Button onClick={() => loadMore()}>Load more</Button>
          )}
        </Stack>
      </Container>
    </>
  );
}
