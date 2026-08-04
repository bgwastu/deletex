"use client";

import type { DeletionTarget, TweetRecord } from "@/data/models";
import { queryTweetsByIds } from "@/data/tweet-store";
import { useI18n } from "@/i18n/locale-provider";
import {
  Anchor,
  Box,
  Button,
  Center,
  Code,
  CopyButton,
  Group,
  Loader,
  Modal,
  ScrollArea,
  Stack,
  Stepper,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import {
  IconArrowLeft,
  IconArrowRight,
  IconBrandX,
  IconCheck,
  IconChecklist,
  IconCopy,
  IconExternalLink,
  IconShieldCheck,
  IconTerminal2,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";

const SCRIPT_PREVIEW_LIMIT = 500;
const REVIEW_PREVIEW_LIMIT = 100;

export interface ScriptMessages {
  confirm: string;
  wrongPage: string;
  noCsrf: string;
  starting: string;
  deleted: string;
  failed: string;
  rateLimited: string;
  stoppedAuth: string;
  complete: string;
  failures: string;
  unavailable: string;
}

export default function GenerateDeleteScriptButton({
  targets,
  disabled,
}: {
  targets: DeletionTarget[];
  disabled?: boolean;
}) {
  const [opened, { open, close }] = useDisclosure(false);
  const [active, setActive] = useState(0);
  const [reviewPosts, setReviewPosts] = useState<TweetRecord[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(false);
  const mobile = useMediaQuery("(max-width: 48em)");
  const { formatDateTime, formatNumber, t } = useI18n();
  const script = useMemo(
    () =>
      generate(targets, {
        confirm: t("scriptConfirm", { count: formatNumber(targets.length) }),
        wrongPage: t("scriptWrongPage"),
        noCsrf: t("scriptNoCsrf"),
        starting: t("scriptStarting"),
        deleted: t("scriptDeleted"),
        failed: t("scriptFailed"),
        rateLimited: t("scriptRateLimited"),
        stoppedAuth: t("scriptStoppedAuth"),
        complete: t("scriptComplete"),
        failures: t("scriptFailures"),
        unavailable: t("scriptUnavailable"),
      }),
    [formatNumber, t, targets],
  );

  function openWizard() {
    setActive(0);
    setReviewLoading(true);
    setReviewError(false);
    open();
    void queryTweetsByIds(
      targets.map((target) => target.id),
      { limit: REVIEW_PREVIEW_LIMIT },
    )
      .then((page) => setReviewPosts(page.items))
      .catch((error) => {
        console.error("Failed to load selected posts:", error);
        setReviewPosts([]);
        setReviewError(true);
      })
      .finally(() => setReviewLoading(false));
  }

  function typeLabel(type: TweetRecord["type"]) {
    if (type === "retweet") return t("repost");
    if (type === "reply") return t("reply");
    return t("post");
  }

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        title={
          <Group gap="xs">
            <ThemeIcon variant="light" color="brand" size="lg">
              <IconShieldCheck size={20} />
            </ThemeIcon>
            <Title order={2} size="h3">{t("deletionWizard")}</Title>
          </Group>
        }
        size="xl"
        fullScreen={mobile}
        centered
        closeButtonProps={{ "aria-label": t("closeWizard") }}
      >
        <Stepper
          active={active}
          onStepClick={setActive}
          allowNextStepsSelect={false}
          iconSize={mobile ? 32 : 38}
          styles={{
            steps: { flexWrap: "nowrap" },
            step: { minWidth: 0 },
            stepLabel: { whiteSpace: "nowrap" },
            stepDescription: {
              color: "var(--mantine-color-brand-7)",
              whiteSpace: "normal",
            },
            separator: { minWidth: 16 },
          }}
        >
          <Stepper.Step
            label={t("wizardReview")}
            description={t("wizardSelectedDescription", {
              count: formatNumber(targets.length),
            })}
            icon={<IconChecklist size={20} />}
          >
            <Stack gap="md" py="lg">
              <Group justify="space-between">
                <Title order={3}>{t("selectedForDeletion")}</Title>
                <Text fw={700}>{formatNumber(targets.length)}</Text>
              </Group>
              {reviewLoading ? (
                <Center h={240}><Loader /></Center>
              ) : reviewError ? (
                <Text c="red">{t("selectedPostsLoadError")}</Text>
              ) : (
                <Box
                  mah={mobile ? 330 : 360}
                  style={{ overflowY: "auto" }}
                >
                  <Stack gap="xs" pr="sm">
                    {reviewPosts.map((post) => (
                      <Box key={post.id} p="sm" bg="brand.0">
                        <Group justify="space-between" gap="sm" mb={4}>
                          <Text size="xs" fw={700}>{typeLabel(post.type)}</Text>
                          <Text size="xs" c="brand.7">{formatDateTime(post.createdAt)}</Text>
                        </Group>
                        <Text size="sm">{post.text}</Text>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
              {reviewPosts.length < targets.length && !reviewLoading && !reviewError && (
                <Text size="xs" c="brand.7">
                  {t("selectedPreviewCount", {
                    shown: formatNumber(reviewPosts.length),
                    total: formatNumber(targets.length),
                  })}
                </Text>
              )}
              <Group justify="flex-end">
                <Button rightSection={<IconArrowRight size={17} />} onClick={() => setActive(1)}>
                  {t("nextStep")}
                </Button>
              </Group>
            </Stack>
          </Stepper.Step>

          <Stepper.Step
            label={t("wizardPrepare")}
            description={t("wizardPrepareDescription")}
            icon={<IconBrandX size={20} />}
          >
            <Stack gap="lg" py="lg">
              <Button
                component="a"
                href="https://x.com/home"
                target="_blank"
                rel="noreferrer"
                variant="light"
                leftSection={<IconBrandX size={18} />}
                rightSection={<IconExternalLink size={16} />}
                style={{ alignSelf: "flex-start" }}
              >
                {t("openX")}
              </Button>
              <Stack gap="md">
                {[t("wizardOpenXInstruction"), t("wizardConsoleInstruction")].map((instruction, index) => (
                  <Group key={instruction} gap="sm" wrap="nowrap" align="flex-start">
                    <ThemeIcon variant="light" color="brand" size="lg">{index + 1}</ThemeIcon>
                    <Text>{instruction}</Text>
                  </Group>
                ))}
                <Group gap="sm" wrap="nowrap" align="flex-start">
                  <ThemeIcon variant="light" color="brand" size="lg">3</ThemeIcon>
                  <Text>
                    {t("wizardPasteInstruction")} <Code>allow pasting</Code>
                  </Text>
                </Group>
              </Stack>
              <Anchor href="https://developer.chrome.com/blog/self-xss" target="_blank" rel="noreferrer" size="sm">
                {t("pasteProtectionHelp")}
              </Anchor>
              <Group justify="space-between">
                <Button variant="default" leftSection={<IconArrowLeft size={17} />} onClick={() => setActive(0)}>
                  {t("back")}
                </Button>
                <Button rightSection={<IconArrowRight size={17} />} onClick={() => setActive(2)}>
                  {t("nextStep")}
                </Button>
              </Group>
            </Stack>
          </Stepper.Step>

          <Stepper.Step
            label={t("wizardCopy")}
            description={t("wizardCopyDescription")}
            icon={<IconTerminal2 size={20} />}
          >
            <Stack gap="md" py="md">
              <Text size="sm" c="brand.7">{t("scriptKeepOpen")}</Text>
              {targets.length <= SCRIPT_PREVIEW_LIMIT ? (
                <ScrollArea h={mobile ? 260 : 320} type="always" offsetScrollbars>
                  <Code block>{script}</Code>
                </ScrollArea>
              ) : (
                <Text c="brand.7" size="sm">{t("scriptLargePreview")}</Text>
              )}
              <Group justify="space-between" align="center">
                <Button variant="default" leftSection={<IconArrowLeft size={17} />} onClick={() => setActive(1)}>
                  {t("back")}
                </Button>
                <CopyButton value={script} timeout={3000}>
                  {({ copy }) => (
                    <Button
                      onClick={() => {
                        copy();
                        setActive(3);
                      }}
                      leftSection={<IconCopy size={17} />}
                    >
                      {t("copyScript")}
                    </Button>
                  )}
                </CopyButton>
              </Group>
            </Stack>
          </Stepper.Step>

          <Stepper.Completed>
            <Stack align="center" py={40} gap="md" ta="center">
              <ThemeIcon size={64} radius="xl" color="green" variant="light">
                <IconCheck size={34} />
              </ThemeIcon>
              <Title order={3}>{t("copied")}</Title>
              <Text maw={520}>{t("wizardCompleteHelp")}</Text>
              <Group>
                <Button variant="default" leftSection={<IconArrowLeft size={17} />} onClick={() => setActive(2)}>
                  {t("back")}
                </Button>
                <Button onClick={close}>{t("done")}</Button>
              </Group>
            </Stack>
          </Stepper.Completed>
        </Stepper>
      </Modal>
      <Button
        onClick={openWizard}
        rightSection={<IconArrowRight size={18} />}
        color="brand"
        size="md"
        disabled={disabled || targets.length === 0}
        style={{ flexShrink: 0 }}
      >
        {t("continueToDeletion")}
      </Button>
    </>
  );
}

export function generate(targets: DeletionTarget[], messages: ScriptMessages) {
  return `(() => {
  "use strict";

  const TARGETS = ${JSON.stringify(targets)};
  const MESSAGES = ${JSON.stringify(messages)};
  const FALLBACK_OPERATIONS = {
    DeleteTweet: "nxpZCY2K-I6QoFHAHeojFQ",
    DeleteRetweet: "ZyZigVsNiFO6v1dEks1eWg"
  };
  const WEB_BEARER = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
  const CHECKPOINT_KEY = "deletex.deletion.checkpoint.v1";

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const format = (template, values) => Object.entries(values).reduce(
    (message, [key, value]) => message.replaceAll("{" + key + "}", String(value)),
    template
  );
  const cookie = (name) => document.cookie
    .split("; ")
    .find((item) => item.startsWith(name + "="))
    ?.slice(name.length + 1);

  const discoveredOperations = {};
  const captureOperations = (source) => {
    for (const name of ["DeleteTweet", "DeleteRetweet"]) {
      const patterns = [
        new RegExp('queryId:"([^"]+)",operationName:"' + name + '"'),
        new RegExp('operationName:"' + name + '",queryId:"([^"]+)"')
      ];
      for (const pattern of patterns) {
        const match = source?.match(pattern);
        if (match) discoveredOperations[name] = match[1];
      }
    }
  };

  async function discoverOperation(name, force = false) {
    if (!force && discoveredOperations[name]) return discoveredOperations[name];
    if (force) delete discoveredOperations[name];
    for (const script of document.scripts) {
      if (!script.src) captureOperations(script.textContent);
    }
    if (discoveredOperations[name]) return discoveredOperations[name];

    const urls = Array.from(new Set([
      ...Array.from(document.scripts, (script) => script.src),
      ...performance.getEntriesByType("resource").map((entry) => entry.name)
    ].filter((url) => url && (url.includes("x.com") || url.includes("twimg.com")) && url.includes(".js"))))
      .sort((a, b) => Number(b.includes("/main.")) - Number(a.includes("/main.")))
      .slice(0, 32);

    for (let index = 0; index < urls.length; index += 8) {
      const sources = await Promise.all(urls.slice(index, index + 8).map(async (url) => {
        try {
          return await (await fetch(url, {
            credentials: "include",
            signal: AbortSignal.timeout(5000)
          })).text();
        } catch {
          return "";
        }
      }));
      sources.forEach(captureOperations);
      if (discoveredOperations[name]) return discoveredOperations[name];
    }
    return FALLBACK_OPERATIONS[name];
  }

  async function run() {
    if (location.hostname !== "x.com") {
      alert(MESSAGES.wrongPage);
      return;
    }
    if (!confirm(MESSAGES.confirm)) return;

    const csrf = cookie("ct0");
    if (!csrf) {
      alert(MESSAGES.noCsrf);
      return;
    }

    const signature = TARGETS.reduce((hash, target) => {
      for (const character of target.id) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
      return hash;
    }, 2166136261).toString(36) + ":" + TARGETS.length;
    const targetsById = new Map(TARGETS.map((target) => [target.id, target]));
    let runTargets = TARGETS;
    let nextIndex = 0;
    let success = 0;
    let failures = [];
    try {
      const checkpoint = JSON.parse(localStorage.getItem(CHECKPOINT_KEY) || "null");
      if (checkpoint?.signature === signature) {
        if (Array.isArray(checkpoint.targetIds)) {
          runTargets = checkpoint.targetIds.map((id) => targetsById.get(id)).filter(Boolean);
        }
        nextIndex = Math.min(Number(checkpoint.nextIndex) || 0, runTargets.length);
        success = Number(checkpoint.success) || 0;
        failures = Array.isArray(checkpoint.failedIds)
          ? checkpoint.failedIds.map((id) => targetsById.get(id)).filter(Boolean)
          : [];
      }
    } catch {}

    const saveCheckpoint = (retryTargets) => {
      try {
        const activeTargets = retryTargets || runTargets;
        localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({
          signature,
          nextIndex: retryTargets ? 0 : nextIndex,
          success,
          failedIds: retryTargets ? [] : failures.map((target) => target.id),
          targetIds: activeTargets === TARGETS
            ? undefined
            : activeTargets.map((target) => target.id)
        }));
      } catch (error) {
        console.warn("DeleteX could not save progress.", error);
      }
    };

    const operations = {
      DeleteTweet: await discoverOperation("DeleteTweet"),
      DeleteRetweet: await discoverOperation("DeleteRetweet")
    };
    let consecutiveFailures = 0;
    console.log(MESSAGES.starting);

    while (nextIndex < runTargets.length) {
      const target = runTargets[nextIndex];
      const useRetweet = target.type === "retweet" && target.sourceTweetId;
      const operation = useRetweet ? "DeleteRetweet" : "DeleteTweet";
      const variables = useRetweet
        ? { source_tweet_id: target.sourceTweetId, dark_request: false }
        : { tweet_id: target.id, dark_request: false };
      let result = null;
      let rateLimitCount = 0;
      let rediscovered = false;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const queryId = operations[operation];
          const response = await fetch("https://x.com/i/api/graphql/" + queryId + "/" + operation, {
            method: "POST",
            credentials: "include",
            signal: AbortSignal.timeout(30000),
            headers: {
              authorization: "Bearer " + WEB_BEARER,
              "content-type": "application/json",
              "x-csrf-token": csrf,
              "x-twitter-active-user": "yes",
              "x-twitter-auth-type": "OAuth2Session",
              "x-twitter-client-language": document.documentElement.lang || "en"
            },
            body: JSON.stringify({ variables, queryId })
          });

          if (response.status === 401 || response.status === 403) {
            saveCheckpoint();
            console.error(MESSAGES.stoppedAuth);
            alert(MESSAGES.stoppedAuth);
            return;
          }
          if (response.status === 429) {
            rateLimitCount++;
            if (rateLimitCount > 3) {
              result = { ok: false, systemic: true, reason: "HTTP 429" };
              break;
            }
            console.warn(MESSAGES.rateLimited);
            const reset = Number(response.headers.get("x-rate-limit-reset"));
            const wait = reset ? Math.max(1000, reset * 1000 - Date.now() + 2000) : 60000;
            saveCheckpoint();
            await sleep(Math.min(wait, 15 * 60 * 1000));
            attempt--;
            continue;
          }

          const body = await response.json().catch(() => null);
          const operationResult = operation === "DeleteTweet"
            ? body?.data?.delete_tweet
            : body?.data?.unretweet;
          if (response.ok && operationResult && !body?.errors?.length) {
            result = { ok: true };
            break;
          }

          const reason = body?.errors?.map((error) => error.message).join("; ")
            || "HTTP " + response.status;
          if (/rate.?limit|too many requests/i.test(reason)) {
            rateLimitCount++;
            if (rateLimitCount > 3) {
              result = { ok: false, systemic: true, reason };
              break;
            }
            saveCheckpoint();
            await sleep(60000);
            attempt--;
            continue;
          }
          if ((response.status === 400 || response.status === 404) && !rediscovered) {
            operations[operation] = await discoverOperation(operation, true);
            rediscovered = true;
            attempt--;
            continue;
          }
          if (response.status === 400 || response.status === 404) {
            result = { ok: false, systemic: true, reason };
            break;
          }
          if (response.status >= 500 && attempt < 2) {
            await sleep((attempt + 1) * 5000 + Math.random() * 1000);
            continue;
          }
          result = { ok: false, reason };
          break;
        } catch (error) {
          if (attempt < 2) {
            await sleep((attempt + 1) * 5000 + Math.random() * 1000);
          } else {
            result = { ok: false, reason: error instanceof Error ? error.message : String(error) };
          }
        }
      }

      if (result?.systemic) {
        saveCheckpoint();
        console.error(MESSAGES.unavailable, result.reason);
        alert(MESSAGES.unavailable);
        return;
      }

      nextIndex++;
      if (result?.ok) {
        success++;
        consecutiveFailures = 0;
        console.log(format(MESSAGES.deleted, { id: target.id, count: runTargets.length - nextIndex }));
      } else {
        failures.push(target);
        consecutiveFailures++;
        console.error(format(MESSAGES.failed, {
          id: target.id,
          reason: result?.reason || "Unknown error"
        }));
      }

      saveCheckpoint();
      if (consecutiveFailures >= 3) {
        console.error(MESSAGES.unavailable);
        alert(MESSAGES.unavailable);
        return;
      }
      await sleep(750 + Math.random() * 750);
    }

    if (failures.length > 0) {
      saveCheckpoint(failures);
      console.error(MESSAGES.failures, failures.map((target) => target.id));
    } else {
      localStorage.removeItem(CHECKPOINT_KEY);
    }

    const summary = format(MESSAGES.complete, { success, failed: failures.length });
    console.log(summary);
    alert(summary);
  }

  void run();
})();`;
}
