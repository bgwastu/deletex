"use client";

import GenerateDeleteScriptButton from "@/components/generate-delete-script-button";
import { clear } from "@/database/db";
import { media, TweetMedia, tweets } from "@/database/schema";
import { appStateAtom } from "@/state";
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
import {
  useDebouncedCallback,
  useDisclosure,
  usePagination,
} from "@mantine/hooks";
import {
  IconArticle,
  IconFilter,
  IconHeart,
  IconHeartFilled,
  IconMessage,
  IconPlayerPlayFilled,
  IconRepeat,
} from "@tabler/icons-react";
import { and, desc, eq, exists, gte, lte, or, sql } from "drizzle-orm";
import { useSetAtom } from "jotai";
import { useEffect, useState } from "react";

const PAGE_SIZE = 20;
const TWEET_TYPES = [
  { value: "tweet", label: "Post" },
  { value: "retweet", label: "Repost" },
  { value: "reply", label: "Reply" },
];

export default function Component() {
  const [loading, setLoading] = useState(true);
  const [listTweet, setListTweet] = useState<TweetMedia[]>([]);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [selectedTweetId, setSelectedTweetId] = useState<string[]>([]);
  const pagination = usePagination({ total: 10, initialPage: 1 });
  const [query, setQuery] = useState("");
  const [filterOpened, { close: closeFilter, open: openFilter }] =
    useDisclosure(false);
  const setAppState = useSetAtom(appStateAtom);

  const form = useForm({
    initialValues: {
      tweetType: ["tweet", "retweet", "reply"] as (
        | "retweet"
        | "tweet"
        | "reply"
      )[],
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

  useEffect(() => {
    getListTweet(1).then((res) => {
      if (res) setListTweet(res);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getWhereClause = () => {
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

    console.log(form.values);

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
  };

  const getListTweet = async (page: number) => {
    setLoading(true);
    const res = await db?.query.tweets.findMany({
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
      with: { media: true },
      where: getWhereClause(),
      orderBy: desc(tweets.createdAt),
    });
    setLoading(false);
    return res;
  };

  const selectAll = async () => {
    const tweetIds = await db?.query.tweets.findMany({
      columns: { id: true },
      where: getWhereClause(),
      orderBy: desc(tweets.createdAt),
    });
    if (tweetIds) {
      setSelectedTweetId(tweetIds.map((tweet) => tweet.id));
      setIsSelectAll(true);
    }
  };

  const clearAll = () => {
    setIsSelectAll(false);
    setSelectedTweetId([]);
  };

  const loadMore = async () => {
    setLoading(true);
    pagination.next();
    const res = await getListTweet(pagination.active + 1);
    if (res) setListTweet([...listTweet, ...res]);
    setLoading(false);
  };

  const applyFilter = async () => {
    closeFilter();
    pagination.setPage(1);
    const res = await getListTweet(1);
    if (res) setListTweet(res);
    setLoading(false);
  };

  const handleSearch = useDebouncedCallback(async (keyword: string) => {
    if (keyword === "") {
      const res = await getListTweet(1);
      if (res) setListTweet(res);
      return;
    }

    setListTweet([]);
    const res = await db?.query.tweets.findMany({
      where: or(
        sql`to_tsvector('english', ${tweets.text}) @@ plainto_tsquery('english', ${keyword})`,
        sql`regexp_like(${tweets.text}, ${keyword}, 'i')`
      ),
      with: { media: true },
      limit: PAGE_SIZE,
      offset: 0,
      orderBy: desc(tweets.createdAt),
    });
    if (res) setListTweet(res);
    clearAll(); // Reset select all state on new search
  }, 500);

  const toggleTweetSelection = (tweetId: string) => {
    setSelectedTweetId((prev) =>
      prev.includes(tweetId)
        ? prev.filter((id) => id !== tweetId)
        : [...prev, tweetId]
    );
  };

  const renderTweetTypeIcon = (type: string) => {
    const iconProps = { style: { width: "70%", height: "70%" } };
    switch (type) {
      case "retweet":
        return <IconRepeat {...iconProps} />;
      case "reply":
        return <IconMessage {...iconProps} />;
      default:
        return <IconArticle {...iconProps} />;
    }
  };

  const resetData = async () => {
    const confirmation = confirm("Are you sure you want to reset all data?");
    if (!confirmation) return;
    await clear();
    setAppState("initial");
  };

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
                  leftSection={<IconFilter size={14} />}
                  variant="outline"
                  onClick={filterOpened ? closeFilter : openFilter}
                >
                  Filter
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <form onSubmit={form.onSubmit(applyFilter)}>
                  <Stack>
                    <MultiSelect
                      label="Post Type"
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
                    <Button type="submit">Apply Filters</Button>
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
                  hidden={query !== ""}
                >
                  {isSelectAll ? "Clear all selection" : "Select all"}
                </Button>
                <Text
                  c="dimmed"
                  size="sm"
                >{`Selected: ${selectedTweetId.length}`}</Text>
              </Flex>
              <GenerateDeleteScriptButton tweetIds={selectedTweetId} />
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
        {loading ? (
          <Center>
            <Loader />
          </Center>
        ) : (
          <Button onClick={loadMore} hidden={listTweet.length < 20}>
            Load more
          </Button>
        )}
      </Stack>
      <Button variant="subtle" onClick={resetData} mt="xl" color="red">
        Reset all the data
      </Button>
    </Container>
  );
}
