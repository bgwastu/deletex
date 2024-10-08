"use client";

import Footer from "@/components/footer";
import GenerateDeleteScriptButton from "@/components/generate-delete-script-button";
import { db } from "@/database/db";
import { media, TweetMedia, tweets } from "@/database/schema";
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
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDebouncedCallback, useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconArticle,
  IconFilter,
  IconFilterFilled,
  IconHeart,
  IconHeartFilled,
  IconMessage,
  IconPlayerPlayFilled,
  IconRepeat,
} from "@tabler/icons-react";
import { and, desc, eq, exists, gte, lt, lte, or, sql } from "drizzle-orm";
import { useCallback, useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 20;
const TWEET_TYPES = [
  { value: "tweet", label: "Post" },
  { value: "retweet", label: "Repost" },
  { value: "reply", label: "Reply" },
];

export default function SearchPage() {
  const [loadingState, setLoadingState] = useState<
    "initial" | "pagination" | "filter" | "reset" | "select_all" | null
  >("initial");
  const [listTweet, setListTweet] = useState<TweetMedia[]>([]);
  const [selectedTweetId, setSelectedTweetId] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [filterOpened, { close: closeFilter, open: openFilter }] =
    useDisclosure(false);
  const [totalPossibleTweet, setTotalPossibleTweet] = useState(0);

  const form = useForm({
    initialValues: {
      tweetType: [] as ("retweet" | "tweet" | "reply")[],
      startDate: null as Date | null,
      endDate: null as Date | null,
      minLikes: null as number | null,
      maxLikes: null as number | null,
      minRetweet: null as number | null,
      maxRetweet: null as number | null,
      containsMedia: false,
    },
    validate: {
      startDate: (value, values) =>
        value && values.endDate && value > values.endDate
          ? "Start date must be before end date"
          : null,
      endDate: (value, values) =>
        value && values.startDate && value < values.startDate
          ? "End date must be after start date"
          : null,
    },
  });

  const isSelectAll = useMemo(
    () =>
      (listTweet.length > 0 &&
        loadingState === null &&
        listTweet.every((tweet) => selectedTweetId.includes(tweet.id))) ||
      selectedTweetId.length === totalPossibleTweet,
    [listTweet, loadingState, selectedTweetId, totalPossibleTweet]
  );

  const getWhereClause = useCallback(() => {
    const {
      startDate,
      endDate,
      minLikes,
      maxLikes,
      minRetweet,
      maxRetweet,
      tweetType,
      containsMedia,
    } = form.values;
    if (!db) return;

    const mediaSubquery = db
      .select()
      .from(media)
      .where(eq(media.tweetId, tweets.id));
    return and(
      minLikes !== null && typeof minLikes !== "string"
        ? gte(tweets.likes, minLikes)
        : undefined,
      maxLikes !== null && typeof maxLikes !== "string"
        ? lte(tweets.likes, maxLikes)
        : undefined,
      minRetweet !== null && typeof minRetweet !== "string"
        ? gte(tweets.retweet, minRetweet)
        : undefined,
      maxRetweet !== null && typeof maxRetweet !== "string"
        ? lte(tweets.retweet, maxRetweet)
        : undefined,
      startDate ? gte(tweets.createdAt, startDate) : undefined,
      endDate ? lte(tweets.createdAt, endDate) : undefined,
      tweetType.length > 0
        ? or(...tweetType.map((type) => eq(tweets.type, type)))
        : undefined,
      containsMedia ? exists(mediaSubquery) : undefined
    );
  }, [form.values]);

  const getListTweet = useCallback(
    async (
      cursor?: Date,
      query?: string,
      columns?: any,
      pageSize: number = PAGE_SIZE,
      withMedia: boolean = true,
      countResult: boolean = true
    ) => {
      const whereClause = getWhereClause();
      const searchClause = query
        ? sql`to_tsvector('english', ${tweets.text}) @@ plainto_tsquery('english', ${query})`
        : undefined;
      const cursorClause = cursor ? lt(tweets.createdAt, cursor) : undefined;

      const w = withMedia
        ? {
            media: {
              columns: {
                previewUrl: true,
                type: true,
              },
            },
          }
        : undefined;

      const tweetResults = await db?.query.tweets.findMany({
        columns,
        limit: pageSize,
        where: and(cursorClause, whereClause, searchClause),
        with: w,
        orderBy: desc(tweets.createdAt),
      });

      if (tweetResults && countResult) {
        const countResults = await db
          ?.select({ count: sql`count(*)`.mapWith(Number) })
          .from(tweets)
          .where(and(cursorClause, whereClause, searchClause));

        if (countResults?.[0].count)
          setTotalPossibleTweet(countResults[0].count);

        if (countResults?.[0].count === listTweet.length) return [];
      }

      return tweetResults as any[];
    },
    [getWhereClause, listTweet.length]
  );

  const selectAll = useCallback(async () => {
    setLoadingState("select_all");
    let tweetIds: string[] = [];
    let cursor;
    while (true) {
      const res = await getListTweet(
        cursor,
        query,
        {
          id: true,
          createdAt: true,
        },
        2000,
        false,
        false
      );
      if (res.length === 0 || tweetIds.length >= totalPossibleTweet) break;
      tweetIds = Array.from(
        new Set(tweetIds.concat(res.map((tweet) => tweet.id)))
      );
      setSelectedTweetId(tweetIds);
      cursor = res[res.length - 1].createdAt;
    }

    if (tweetIds) {
      setSelectedTweetId(tweetIds);
    }
    setLoadingState(null);
  }, [getListTweet, query, totalPossibleTweet]);

  const clearAll = useCallback(() => {
    setSelectedTweetId([]);
  }, []);

  const loadMore = useCallback(async () => {
    setLoadingState("pagination");
    const lastTweet = listTweet[listTweet.length - 1];
    const res = await getListTweet(lastTweet.createdAt ?? undefined);
    if (res) {
      setListTweet((prev) => [...prev, ...res]);
    } else {
      notifications.show({
        title: "No more content",
        message: "You have reached the end of the contents.",
      });
    }
    setLoadingState(null);
  }, [getListTweet, listTweet]);

  const applyFilter = useCallback(async () => {
    setLoadingState("filter");
    const res = await getListTweet();
    if (res) setListTweet(res);
    setLoadingState(null);
    closeFilter();
  }, [getListTweet, closeFilter]);

  const handleSearch = useDebouncedCallback(async (keyword: string) => {
    if (keyword === "") {
      const res = await getListTweet();
      if (res) setListTweet(res);
      return;
    }

    setListTweet([]);
    const res = await getListTweet(undefined, keyword);
    if (res) setListTweet(res);
    clearAll();
  }, 500);

  const toggleTweetSelection = useCallback((tweetId: string) => {
    setSelectedTweetId((prev) =>
      prev.includes(tweetId)
        ? prev.filter((id) => id !== tweetId)
        : [...prev, tweetId]
    );
  }, []);

  const renderTweetTypeIcon = useCallback((type: string) => {
    const iconProps = { style: { width: "70%", height: "70%" } };
    switch (type) {
      case "retweet":
        return <IconRepeat {...iconProps} />;
      case "reply":
        return <IconMessage {...iconProps} />;
      default:
        return <IconArticle {...iconProps} />;
    }
  }, []);

  useEffect(() => {
    getListTweet().then((res) => {
      if (res) setListTweet(res);
      setLoadingState(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loadingState === "initial") {
    return (
      <Stack mih="99vh" align="center" justify="center">
        <Loader />
        <Text>Load the data, please wait...</Text>
      </Stack>
    );
  }

  return (
    <Container my="xl">
      <Stack>
        <Stack>
          <Flex gap="sm">
            <TextInput
              size="md"
              placeholder="Search posts..."
              value={query}
              flex={1}
              onChange={(e) => {
                setQuery(e.currentTarget.value);
                handleSearch(e.currentTarget.value);
              }}
            />
            <Popover
              width={350}
              trapFocus
              withArrow
              shadow="md"
              clickOutsideEvents={[]}
              opened={filterOpened}
            >
              <Popover.Target>
                <Button
                  size="md"
                  leftSection={
                    form.isDirty() ? (
                      <IconFilterFilled size={18} />
                    ) : (
                      <IconFilter size={18} />
                    )
                  }
                  variant={form.isDirty() ? "filled" : "outline"}
                  onClick={filterOpened ? closeFilter : openFilter}
                >
                  Filter
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <form onSubmit={form.onSubmit(applyFilter)}>
                  <Stack>
                    <MultiSelect
                      label="Content Type"
                      data={TWEET_TYPES}
                      clearable
                      size="sm"
                      {...form.getInputProps("tweetType")}
                    />
                    <Stack gap="xs">
                      <Input.Wrapper label="Date Range">
                        <Group gap="sm" grow>
                          <DatePickerInput
                            placeholder="From"
                            valueFormat="DD/MM/YYYY"
                            clearable
                            {...form.getInputProps("startDate")}
                          />
                          <DatePickerInput
                            placeholder="To"
                            valueFormat="DD/MM/YYYY"
                            maxDate={new Date()}
                            clearable
                            {...form.getInputProps("endDate")}
                          />
                        </Group>
                      </Input.Wrapper>
                    </Stack>
                    <Input.Wrapper label="Likes Range">
                      <Flex gap="sm" align="start">
                        <NumberInput
                          aria-label="Minimum likes"
                          flex={1}
                          min={0}
                          step={1}
                          placeholder="Minimum"
                          leftSection={<IconHeart size={14} />}
                          hideControls
                          {...form.getInputProps("minLikes")}
                        />
                        <NumberInput
                          aria-label="Maximum likes"
                          placeholder="Maximum"
                          flex={1}
                          min={0}
                          step={1}
                          defaultValue={null}
                          leftSection={<IconHeart size={14} />}
                          hideControls
                          {...form.getInputProps("maxLikes")}
                        />
                      </Flex>
                    </Input.Wrapper>
                    <Input.Wrapper label="Repost Range">
                      <Flex gap="sm" align="start">
                        <NumberInput
                          aria-label="Minimum likes"
                          flex={1}
                          min={0}
                          step={1}
                          placeholder="Minimum"
                          leftSection={<IconRepeat size={14} />}
                          hideControls
                          {...form.getInputProps("minRetweet")}
                        />
                        <NumberInput
                          aria-label="Maximum reposts"
                          placeholder="Maximum"
                          flex={1}
                          min={0}
                          leftSection={<IconRepeat size={14} />}
                          step={1}
                          hideControls
                          {...form.getInputProps("maxRetweet")}
                        />
                      </Flex>
                    </Input.Wrapper>
                    <Checkbox
                      label="Contains media"
                      {...form.getInputProps("containsMedia", {
                        type: "checkbox",
                      })}
                    />
                    <Button type="submit" loading={loadingState === "filter"}>
                      Apply Filters
                    </Button>
                  </Stack>
                </form>
              </Popover.Dropdown>
            </Popover>
          </Flex>
          {selectedTweetId.length > 0 && (
            <Group justify="space-between">
              <Flex align="center" gap="sm">
                <Button
                  onClick={isSelectAll ? clearAll : selectAll}
                  color={isSelectAll ? "red" : "brand"}
                  variant={isSelectAll ? "light" : "filled"}
                  loading={loadingState === "select_all"}
                >
                  {isSelectAll ? "Clear all selection" : "Select all"}
                </Button>
                <Text
                  c="dimmed"
                  size="sm"
                >{`${selectedTweetId.length} of ${totalPossibleTweet} selected`}</Text>
              </Flex>
              <GenerateDeleteScriptButton
                tweetIds={selectedTweetId}
                disabled={loadingState === "select_all"}
              />
            </Group>
          )}
        </Stack>
        <Stack>
          {listTweet.map((tweet) => (
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
              onClick={() => toggleTweetSelection(tweet.id)}
              bg="white"
            >
              <Flex gap="sm">
                <Checkbox.Indicator mt={4} />
                <Stack w="100%" gap="xs">
                  <Flex justify="space-between">
                    <Flex gap={2} align="center">
                      <ThemeIcon
                        variant="white"
                        size="md"
                        c={
                          tweet.type === "retweet"
                            ? "green.6"
                            : tweet.type === "reply"
                              ? "blue.6"
                              : "dimmed"
                        }
                      >
                        {renderTweetTypeIcon(tweet.type ?? "tweet")}
                      </ThemeIcon>
                      <Text size="sm" c="dimmed">
                        {TWEET_TYPES.find((t) => t.value === tweet.type)?.label}
                      </Text>
                    </Flex>
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
                        <Box
                          key={index}
                          className={css({
                            position: "relative",
                          })}
                        >
                          <Image
                            src={mediaItem.previewUrl}
                            alt={`media-${index}`}
                          />
                          {mediaItem.type !== "photo" && (
                            <Anchor
                              href={"https://x.com/i/web/status/" + tweet.id}
                              target="_blank"
                            >
                              <Center
                                className={css({
                                  position: "absolute",
                                  top: "5",
                                  left: "5",
                                  right: "5",
                                  bottom: "5",
                                })}
                              >
                                <ThemeIcon
                                  size="xl"
                                  variant="default"
                                  radius="xl"
                                >
                                  <IconPlayerPlayFilled size={24} />
                                </ThemeIcon>
                              </Center>
                            </Anchor>
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
                        <IconRepeat style={{ width: "70%", height: "70%" }} />
                      </ThemeIcon>
                      <Text fz="sm" c="dimmed">
                        {tweet.retweet}
                      </Text>
                    </Flex>
                  </Group>
                </Stack>
              </Flex>
            </Checkbox.Card>
          ))}
        </Stack>
        <Button
          onClick={loadMore}
          hidden={
            totalPossibleTweet === listTweet.length || listTweet.length === 0
          }
          loading={loadingState === "pagination"}
        >
          Load more
        </Button>
      </Stack>
      <Footer />
    </Container>
  );
}
