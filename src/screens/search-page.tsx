"use client";

import GenerateDeleteScriptButton from "@/components/generate-delete-script-button";
import type {
  DeletionTarget,
  TweetCriteria,
  TweetFilters,
  TweetRecord,
  TweetType,
} from "@/data/models";
import {
  getMatchingDeletionTargets,
  queryTweets,
  queryTweetsByIds,
} from "@/data/tweet-store";
import { useI18n } from "@/i18n/locale-provider";
import {
  Alert,
  Anchor,
  ActionIcon,
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
  Paper,
  Pill,
  Popover,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import { useDisclosure, useIntersection } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconArticle,
  IconFilter,
  IconFilterFilled,
  IconHeart,
  IconHeartFilled,
  IconListCheck,
  IconMessage,
  IconPlayerPlayFilled,
  IconRepeat,
  IconSearch,
  IconSearchOff,
  IconTrashX,
  IconX,
} from "@tabler/icons-react";
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const PAGE_SIZE = 20;
const EMPTY_SELECTED_IDS: string[] = [];
const EMPTY_FILTERS: TweetFilters = {
  tweetType: [],
  startDate: null,
  endDate: null,
  minLikes: null,
  maxLikes: null,
  minRetweet: null,
  maxRetweet: null,
  containsMedia: false,
};

type FilterGroup = "type" | "date" | "likes" | "reposts" | "media";

export default function SearchPage() {
  const { formatDateTime, formatNumber, t } = useI18n();
  const [items, setItems] = useState<TweetRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<{
    createdAt: Date;
    id: string;
  } | null>(null);
  const [selected, setSelected] = useState<Map<string, DeletionTarget>>(
    new Map(),
  );
  const [matchingTargets, setMatchingTargets] = useState<
    Map<string, DeletionTarget>
  >(new Map());
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [filters, setFilters] = useState<TweetFilters>(EMPTY_FILTERS);
  const [initialLoading, setInitialLoading] = useState(true);
  const [queryLoading, setQueryLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState(false);
  const [paginationError, setPaginationError] = useState(false);
  const requestId = useRef(0);
  const moreInFlight = useRef(false);
  const [filterOpened, { close: closeFilter, open: openFilter }] =
    useDisclosure(false);
  const { ref: sentinelRef, entry: sentinelEntry } =
    useIntersection<HTMLDivElement>({ rootMargin: "500px 0px" });

  const form = useForm<TweetFilters>({
    initialValues: EMPTY_FILTERS,
    validate: {
      startDate: (value, values) =>
        value && values.endDate && value > values.endDate
          ? t("invalidDateRange")
          : null,
      endDate: (value, values) =>
        value && values.startDate && value < values.startDate
          ? t("invalidDateRange")
          : null,
      minLikes: (value, values) =>
        value != null && values.maxLikes != null && value > values.maxLikes
          ? t("invalidNumberRange")
          : null,
      minRetweet: (value, values) =>
        value != null &&
        values.maxRetweet != null &&
        value > values.maxRetweet
          ? t("invalidNumberRange")
          : null,
    },
  });

  const criteria = useMemo<TweetCriteria>(
    () => ({ query: deferredQuery.trim(), filters }),
    [deferredQuery, filters],
  );
  const displayedSelectedIds = useMemo(
    () => (showSelectedOnly ? [...selected.keys()] : EMPTY_SELECTED_IDS),
    [selected, showSelectedOnly],
  );

  const typeOptions = useMemo(
    () => [
      { value: "tweet", label: t("post") },
      { value: "retweet", label: t("repost") },
      { value: "reply", label: t("reply") },
    ],
    [t],
  );

  const activeGroups = useMemo<FilterGroup[]>(() => {
    const groups: FilterGroup[] = [];
    if (filters.tweetType.length > 0) groups.push("type");
    if (filters.startDate || filters.endDate) groups.push("date");
    if (filters.minLikes != null || filters.maxLikes != null)
      groups.push("likes");
    if (filters.minRetweet != null || filters.maxRetweet != null)
      groups.push("reposts");
    if (filters.containsMedia) groups.push("media");
    return groups;
  }, [filters]);

  const loadFirstPage = useCallback(async () => {
    const currentRequest = ++requestId.current;
    if (!initialLoading) setQueryLoading(true);
    setError(false);
    setPaginationError(false);
    try {
      const [page, targets] = showSelectedOnly
        ? [
            await queryTweetsByIds(displayedSelectedIds, { limit: PAGE_SIZE }),
            [],
          ]
        : await Promise.all([
            queryTweets(criteria, { limit: PAGE_SIZE }),
            getMatchingDeletionTargets(criteria),
          ]);
      if (currentRequest !== requestId.current) return;
      startTransition(() => {
        setItems(page.items);
        setTotal(page.total);
        setHasMore(page.hasMore);
        setNextCursor(page.nextCursor);
        setMatchingTargets(
          new Map(targets.map((target) => [target.id, target])),
        );
      });
    } catch (loadError) {
      if (currentRequest !== requestId.current) return;
      console.error("Failed to query posts:", loadError);
      setError(true);
    } finally {
      if (currentRequest === requestId.current) {
        setInitialLoading(false);
        setQueryLoading(false);
      }
    }
  }, [criteria, displayedSelectedIds, initialLoading, showSelectedOnly]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || !hasMore || moreInFlight.current) return;
    const currentRequest = requestId.current;
    moreInFlight.current = true;
    setMoreLoading(true);
    setPaginationError(false);
    try {
      const page = showSelectedOnly
        ? await queryTweetsByIds(displayedSelectedIds, {
            cursor: nextCursor,
            limit: PAGE_SIZE,
          })
        : await queryTweets(criteria, {
            cursor: nextCursor,
            limit: PAGE_SIZE,
          });
      if (currentRequest !== requestId.current) return;
      setItems((current) => [...current, ...page.items]);
      setHasMore(page.hasMore);
      setNextCursor(page.nextCursor);
    } catch (loadError) {
      if (currentRequest !== requestId.current) return;
      console.error("Failed to load more posts:", loadError);
      setPaginationError(true);
    } finally {
      moreInFlight.current = false;
      setMoreLoading(false);
    }
  }, [criteria, displayedSelectedIds, hasMore, nextCursor, showSelectedOnly]);

  useEffect(() => {
    queueMicrotask(() => void loadFirstPage());
  }, [loadFirstPage]);

  useEffect(() => {
    if (
      sentinelEntry?.isIntersecting &&
      hasMore &&
      !moreLoading &&
      !paginationError
    ) {
      queueMicrotask(() => void loadMore());
    }
  }, [hasMore, loadMore, moreLoading, paginationError, sentinelEntry?.isIntersecting]);

  function invalidateResults() {
    requestId.current++;
    setMatchingTargets(new Map());
  }

  function applyFilters(values: TweetFilters) {
    invalidateResults();
    setFilters({ ...values, tweetType: [...values.tweetType] });
    closeFilter();
  }

  function openFilters() {
    form.setValues({ ...filters, tweetType: [...filters.tweetType] });
    form.resetDirty(filters);
    openFilter();
  }

  function clearFilterGroup(group: FilterGroup) {
    invalidateResults();
    setFilters((current) => {
      const next = { ...current, tweetType: [...current.tweetType] };
      if (group === "type") next.tweetType = [];
      if (group === "date") {
        next.startDate = null;
        next.endDate = null;
      }
      if (group === "likes") {
        next.minLikes = null;
        next.maxLikes = null;
      }
      if (group === "reposts") {
        next.minRetweet = null;
        next.maxRetweet = null;
      }
      if (group === "media") next.containsMedia = false;
      form.setValues(next);
      return next;
    });
  }

  function resetFilters() {
    invalidateResults();
    setFilters(EMPTY_FILTERS);
    form.setValues(EMPTY_FILTERS);
    closeFilter();
  }

  function renderTypeIcon(type: TweetType) {
    const style = { width: "70%", height: "70%" };
    if (type === "retweet") return <IconRepeat style={style} />;
    if (type === "reply") return <IconMessage style={style} />;
    return <IconArticle style={style} />;
  }

  function typeLabel(type: TweetType) {
    if (type === "retweet") return t("repost");
    if (type === "reply") return t("reply");
    return t("post");
  }

  function filterLabel(group: FilterGroup) {
    if (group === "type") {
      return filters.tweetType.map(typeLabel).join(" + ");
    }
    if (group === "date") {
      return t("dateFilter", {
        from: filters.startDate || "…",
        to: filters.endDate || "…",
      });
    }
    if (group === "likes") {
      return t("rangeFilter", {
        name: t("likes"),
        min: filters.minLikes ?? "…",
        max: filters.maxLikes ?? "…",
      });
    }
    if (group === "reposts") {
      return t("rangeFilter", {
        name: t("reposts"),
        min: filters.minRetweet ?? "…",
        max: filters.maxRetweet ?? "…",
      });
    }
    return t("hasMedia");
  }

  const currentSelectedCount = [...matchingTargets.keys()].reduce(
    (count, id) => count + Number(selected.has(id)),
    0,
  );
  const allMatchingSelected =
    matchingTargets.size > 0 && currentSelectedCount === matchingTargets.size;

  function selectAllMatching() {
    setSelected((current) => {
      const next = new Map(current);
      for (const [id, target] of matchingTargets) next.set(id, target);
      return next;
    });
  }

  function toggleAllSelection() {
    if (allMatchingSelected) {
      setSelected((current) => {
        const next = new Map(current);
        for (const id of matchingTargets.keys()) next.delete(id);
        return next;
      });
    } else selectAllMatching();
  }

  function toggleSelection(tweet: TweetRecord) {
    if (showSelectedOnly && selected.size === 1 && selected.has(tweet.id)) {
      setShowSelectedOnly(false);
    }
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(tweet.id)) next.delete(tweet.id);
      else
        next.set(tweet.id, {
          id: tweet.id,
          type: tweet.type,
          sourceTweetId: tweet.sourceTweetId,
        });
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Map());
    setShowSelectedOnly(false);
  }

  if (initialLoading) {
    return (
      <Stack mih="calc(100vh - 58px)" align="center" justify="center">
        <Loader />
        <Text role="status">{t("loadingPosts")}</Text>
      </Stack>
    );
  }

  return (
    <Container component="main" my={{ base: "sm", sm: "md" }} pb={110} size="md">
      <Stack gap="md">
        {showSelectedOnly && (
          <Paper withBorder p="sm" bg="white">
            <Flex justify="space-between" align="center" gap="md" wrap="wrap">
              <Group gap="sm" wrap="nowrap">
                <ThemeIcon color="brand" variant="light" size="lg">
                  <IconListCheck size={20} />
                </ThemeIcon>
                <Box>
                  <Text fw={700}>
                    {t("viewingSelected", { count: formatNumber(selected.size) })}
                  </Text>
                  <Text size="xs" c="brand.7">{t("selectedViewHelp")}</Text>
                </Box>
              </Group>
              <Button size="xs" variant="default" onClick={() => setShowSelectedOnly(false)}>
                {t("backToResults")}
              </Button>
            </Flex>
          </Paper>
        )}

        <Stack gap="xs" style={{ display: showSelectedOnly ? "none" : undefined }}>
          <Flex gap="xs" align="start">
            <TextInput
              size="sm"
              aria-label={t("search")}
              placeholder={t("search")}
              leftSection={<IconSearch size={17} />}
              value={query}
              flex={1}
              rightSection={queryLoading ? <Loader size="xs" /> : null}
              onChange={(event) => {
                invalidateResults();
                setQuery(event.currentTarget.value);
              }}
            />
            <Popover
              width={350}
              trapFocus
              withArrow
              shadow="md"
              position="bottom-end"
              opened={filterOpened}
              onChange={(opened) => (opened ? openFilters() : closeFilter())}
              styles={{
                dropdown: { width: "min(350px, calc(100vw - 24px))" },
              }}
            >
              <Popover.Target>
                <Button
                  size="sm"
                  leftSection={
                    activeGroups.length > 0 ? (
                      <IconFilterFilled size={17} />
                    ) : (
                      <IconFilter size={17} />
                    )
                  }
                  variant={activeGroups.length > 0 ? "filled" : "outline"}
                  onClick={filterOpened ? closeFilter : openFilters}
                >
                  {activeGroups.length > 0
                    ? t("filtersWithCount", { count: activeGroups.length })
                    : t("filter")}
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    const validation = form.validate();
                    if (!validation.hasErrors) applyFilters(form.getValues());
                  }}
                >
                  <Stack gap="sm">
                    <MultiSelect
                      label={t("contentType")}
                      data={typeOptions}
                      comboboxProps={{ withinPortal: false }}
                      clearable
                      size="sm"
                      {...form.getInputProps("tweetType")}
                    />
                    <Input.Wrapper label={t("dateRange")}>
                      <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
                        <DatePickerInput
                          placeholder={t("from")}
                          valueFormat="ll"
                          maxDate={new Date().toISOString().slice(0, 10)}
                          clearable
                          popoverProps={{ withinPortal: false }}
                          size="sm"
                          {...form.getInputProps("startDate")}
                        />
                        <DatePickerInput
                          placeholder={t("to")}
                          valueFormat="ll"
                          maxDate={new Date().toISOString().slice(0, 10)}
                          clearable
                          popoverProps={{ withinPortal: false }}
                          size="sm"
                          {...form.getInputProps("endDate")}
                        />
                      </SimpleGrid>
                    </Input.Wrapper>
                    <Input.Wrapper label={t("likesRange")}>
                      <Flex gap="xs" align="start">
                        <NumberInput
                          aria-label={t("minimumLikes")}
                          flex={1}
                          min={0}
                          allowDecimal={false}
                          placeholder={t("minimum")}
                          leftSection={<IconHeart size={14} />}
                          hideControls
                          size="sm"
                          {...form.getInputProps("minLikes")}
                        />
                        <NumberInput
                          aria-label={t("maximumLikes")}
                          flex={1}
                          min={0}
                          allowDecimal={false}
                          placeholder={t("maximum")}
                          leftSection={<IconHeart size={14} />}
                          hideControls
                          size="sm"
                          {...form.getInputProps("maxLikes")}
                        />
                      </Flex>
                    </Input.Wrapper>
                    <Input.Wrapper label={t("repostsRange")}>
                      <Flex gap="xs" align="start">
                        <NumberInput
                          aria-label={t("minimumReposts")}
                          flex={1}
                          min={0}
                          allowDecimal={false}
                          placeholder={t("minimum")}
                          leftSection={<IconRepeat size={14} />}
                          hideControls
                          size="sm"
                          {...form.getInputProps("minRetweet")}
                        />
                        <NumberInput
                          aria-label={t("maximumReposts")}
                          flex={1}
                          min={0}
                          allowDecimal={false}
                          placeholder={t("maximum")}
                          leftSection={<IconRepeat size={14} />}
                          hideControls
                          size="sm"
                          {...form.getInputProps("maxRetweet")}
                        />
                      </Flex>
                    </Input.Wrapper>
                    <Checkbox
                      label={t("containsMedia")}
                      {...form.getInputProps("containsMedia", {
                        type: "checkbox",
                      })}
                    />
                    <Group grow>
                      <Button variant="default" onClick={resetFilters}>
                        {t("resetFilters")}
                      </Button>
                      <Button type="submit">{t("applyFilters")}</Button>
                    </Group>
                  </Stack>
                </form>
              </Popover.Dropdown>
            </Popover>
          </Flex>

          {activeGroups.length > 0 && (
            <Group gap={6} align="center">
              <Pill.Group>
                {activeGroups.map((group) => (
                  <Pill
                    key={group}
                    withRemoveButton
                    removeButtonProps={{
                      "aria-label": t("removeFilter", {
                        filter: filterLabel(group),
                      }),
                      onClick: () => clearFilterGroup(group),
                    }}
                  >
                    {filterLabel(group)}
                  </Pill>
                ))}
              </Pill.Group>
              <Button
                size="compact-xs"
                variant="subtle"
                color="red"
                onClick={resetFilters}
              >
                {t("resetFilters")}
              </Button>
            </Group>
          )}

          <Paper withBorder p="xs" bg="white">
            <Flex justify="space-between" align="center" gap="xs" wrap="wrap">
              <Group gap="xs">
                <Checkbox
                  checked={allMatchingSelected}
                  indeterminate={currentSelectedCount > 0 && !allMatchingSelected}
                  disabled={matchingTargets.size === 0 || queryLoading}
                  label={t("selectAllMatchingCount", {
                    count: formatNumber(matchingTargets.size),
                  })}
                  onChange={toggleAllSelection}
                />
                <Text size="xs" c="brand.7" aria-live="polite">
                  {t("selectionContext", {
                    selected: formatNumber(selected.size),
                    current: formatNumber(currentSelectedCount),
                  })}
                </Text>
              </Group>
              {selected.size > 0 && (
                <Group gap={4}>
                  <Button
                    size="compact-xs"
                    variant="light"
                    leftSection={<IconListCheck size={14} />}
                    onClick={() => setShowSelectedOnly(true)}
                  >
                    {t("viewSelected", { count: formatNumber(selected.size) })}
                  </Button>
                  <Tooltip label={t("clearSelection")}>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      aria-label={t("clearSelection")}
                      onClick={clearSelection}
                    >
                      <IconX size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              )}
            </Flex>
          </Paper>
        </Stack>

        {error && (
          <Alert icon={<IconAlertTriangle />} color="red" title={t("queryError")}>
            <Text mb="sm">{t("queryErrorHelp")}</Text>
            <Button size="xs" variant="outline" onClick={loadFirstPage}>
              {t("retry")}
            </Button>
          </Alert>
        )}

        {!error && queryLoading && items.length === 0 ? (
          <Center py={72}>
            <Stack align="center" gap="xs">
              <Loader />
              <Text c="brand.7" role="status">{t("loadingPosts")}</Text>
            </Stack>
          </Center>
        ) : !error && items.length === 0 ? (
          <Center py={72}>
            <Stack align="center" gap="xs">
              <ThemeIcon size={52} radius="xl" variant="light" color="brand">
                <IconSearchOff size={26} />
              </ThemeIcon>
              <Title order={2}>
                {showSelectedOnly ? t("noSelectedPosts") : t("noResults")}
              </Title>
              <Text c="brand.7">
                {showSelectedOnly ? t("noSelectedPostsHelp") : t("noResultsHelp")}
              </Text>
            </Stack>
          </Center>
        ) : (
          <SimpleGrid
            role="region"
            aria-label={t("archivePosts")}
            cols={{ base: 1, md: 2 }}
            spacing="xs"
          >
            {items.map((tweet) => {
              const checked = selected.has(tweet.id);
              const accessibleText = tweet.text.slice(0, 80);
              return (
                <Paper
                  component="article"
                  withBorder
                  p="xs"
                  key={tweet.id}
                  bg={checked ? "brand.0" : "white"}
                  onClick={() => toggleSelection(tweet)}
                  style={{
                    borderColor: checked
                      ? "var(--mantine-primary-color-filled)"
                      : undefined,
                    boxShadow: checked
                      ? "inset 0 0 0 1px var(--mantine-primary-color-filled)"
                      : undefined,
                    cursor: "pointer",
                    transition: "border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease",
                    minWidth: 0,
                  }}
                >
                  <Stack gap={6}>
                    <Flex justify="space-between" gap="xs" align="center">
                      <Group gap={5} wrap="nowrap" style={{ minWidth: 0 }}>
                        <Checkbox
                          checked={checked}
                          aria-label={t("selectPostDetail", {
                            date: formatDateTime(tweet.createdAt),
                            text: accessibleText,
                          })}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleSelection(tweet)}
                        />
                        <ThemeIcon
                          variant="white"
                          size="sm"
                          c={
                            tweet.type === "retweet"
                              ? "green.6"
                              : tweet.type === "reply"
                                ? "blue.6"
                                : "dimmed"
                          }
                        >
                          {renderTypeIcon(tweet.type)}
                        </ThemeIcon>
                        <Text size="xs" c="brand.7">
                          {typeLabel(tweet.type)}
                        </Text>
                      </Group>
                      <Anchor
                        href={`https://x.com/i/web/status/${tweet.id}`}
                        fz="xs"
                        c="brand.7"
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t("openPost")}
                        style={{ flexShrink: 0 }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {formatDateTime(tweet.createdAt)}
                      </Anchor>
                    </Flex>
                    <Text size="sm" lh={1.35} style={{ overflowWrap: "anywhere" }}>
                      {tweet.text}
                    </Text>
                    {tweet.media.length > 0 && (
                      <SimpleGrid spacing={6} cols={{ base: 1, sm: 2 }}>
                        {tweet.media.map((mediaItem, index) => (
                          <Box key={mediaItem.id} style={{ position: "relative" }}>
                            <Image
                              src={mediaItem.previewUrl}
                              alt={t("mediaAlt", { number: index + 1 })}
                              h={140}
                              fit="cover"
                              loading="lazy"
                              radius="sm"
                            />
                            {mediaItem.type !== "photo" && (
                              <Anchor
                                href={`https://x.com/i/web/status/${tweet.id}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label={t("playMedia")}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <Center style={{ position: "absolute", inset: 5 }}>
                                  <ThemeIcon size="lg" variant="default" radius="xl">
                                    <IconPlayerPlayFilled size={20} />
                                  </ThemeIcon>
                                </Center>
                              </Anchor>
                            )}
                          </Box>
                        ))}
                      </SimpleGrid>
                    )}
                    <Group gap="sm">
                      <Group role="img" gap={3} wrap="nowrap" aria-label={t("likesCount", { count: formatNumber(tweet.likes) })}>
                        <IconHeartFilled size={13} color="var(--mantine-color-brand-7)" />
                        <Text fz="xs" c="brand.7">{formatNumber(tweet.likes)}</Text>
                      </Group>
                      <Group role="img" gap={3} wrap="nowrap" aria-label={t("repostsCount", { count: formatNumber(tweet.retweet) })}>
                        <IconRepeat size={13} color="var(--mantine-color-brand-7)" />
                        <Text fz="xs" c="brand.7">{formatNumber(tweet.retweet)}</Text>
                      </Group>
                    </Group>
                  </Stack>
                </Paper>
              );
            })}
          </SimpleGrid>
        )}

        <Box ref={sentinelRef} aria-hidden="true" mih={4} />
        {moreLoading && (
          <Group justify="center" role="status">
            <Loader size="sm" />
            <Text size="sm" c="brand.7">{t("loadingMore")}</Text>
          </Group>
        )}
        {paginationError && (
          <Group justify="center">
            <Text size="sm" c="red">{t("paginationError")}</Text>
            <Button size="compact-sm" variant="outline" onClick={loadMore}>
              {t("retry")}
            </Button>
          </Group>
        )}
        {!hasMore && items.length > 0 && (
          <Text ta="center" size="xs" c="brand.7" role="status">
            {showSelectedOnly
              ? t("allSelectedLoaded", { count: formatNumber(total) })
              : t("allPostsLoaded", { count: formatNumber(total) })}
          </Text>
        )}
      </Stack>
      <Box
        component="aside"
        aria-label={t("deletionActions")}
        bg="white"
        style={{
          position: "fixed",
          zIndex: 90,
          left: 0,
          right: 0,
          bottom: 0,
          borderTop: "1px solid var(--mantine-color-brand-2)",
          boxShadow: "0 -8px 24px rgba(32, 34, 43, 0.08)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <Container size="md" py="sm">
          <Group justify="space-between" wrap="nowrap" gap="md">
            <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
              <ThemeIcon color="brand" variant="light" size="lg">
                <IconTrashX size={20} />
              </ThemeIcon>
              <Box style={{ minWidth: 0 }}>
                <Text size="xs" c="brand.7">{t("readyToContinue")}</Text>
                <Text fw={700} truncate>
                  {t("basketCount", { count: formatNumber(selected.size) })}
                </Text>
              </Box>
            </Group>
            <GenerateDeleteScriptButton
              targets={[...selected.values()]}
            />
          </Group>
        </Container>
      </Box>
    </Container>
  );
}
