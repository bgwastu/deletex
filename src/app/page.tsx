"use client";

import AppHeader from "@/components/app-header";
import type { TweetRecord } from "@/data/models";
import {
  clearAllLocalData,
  clearLegacyPGliteData,
  countTweets,
  hasLegacyPGliteData,
  initializeTweetStore,
  replaceTweets,
} from "@/data/tweet-store";
import { useI18n } from "@/i18n/locale-provider";
import InitialPage from "@/screens/initial-page";
import SearchPage from "@/screens/search-page";
import { Alert, Button, Loader, Stack, Text, Title } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";

type AppState = "loading" | "initial" | "ready" | "error";

export default function Home() {
  const [appState, setAppState] = useState<AppState>("loading");
  const [isClearing, setIsClearing] = useState(false);
  const [hasLegacyData, setHasLegacyData] = useState(false);
  const [activity, setActivity] = useState<"initialize" | "import" | "clear">(
    "initialize",
  );
  const { t } = useI18n();

  const initialize = useCallback(async () => {
    setActivity("initialize");
    setAppState("loading");
    try {
      await initializeTweetStore();
      setHasLegacyData(await hasLegacyPGliteData());
      setAppState((await countTweets()) === 0 ? "initial" : "ready");
    } catch (error) {
      console.error("Storage initialization failed:", error);
      setAppState("error");
    }
  }, []);

  useEffect(
    function initial() {
      queueMicrotask(() => void initialize());
    },
    [initialize]
  );

  async function goHome() {
    if (!confirm(t("clearLocalDataConfirm"))) return;
    setIsClearing(true);
    setActivity("clear");
    try {
      await clearAllLocalData();
      setHasLegacyData(false);
      await initialize();
    } catch (error) {
      console.error("Storage reset failed:", error);
      setAppState("error");
    } finally {
      setIsClearing(false);
    }
  }

  async function importArchive(tweets: TweetRecord[]) {
    setActivity("import");
    setAppState("loading");
    try {
      await replaceTweets(tweets);
      if (hasLegacyData) {
        try {
          await clearLegacyPGliteData();
          setHasLegacyData(false);
        } catch (error) {
          console.warn("The legacy archive could not be removed:", error);
        }
      }
      notifications.show({
        title: t("importSuccess"),
        message: t("importSuccessMessage"),
      });
      setAppState("ready");
    } catch (error) {
      console.error("Archive import failed:", error);
      notifications.show({
        title: t("importError"),
        message: t("importErrorMessage"),
        color: "red",
      });
      setAppState("initial");
    }
  }

  const content = (() => {
    if (appState === "loading") {
      return (
        <Stack mih="calc(100vh - 58px)" align="center" justify="center">
          <Loader />
          <Text role="status">
            {activity === "import"
              ? t("importing")
              : activity === "clear"
                ? t("clearingData")
                : t("initializing")}
          </Text>
        </Stack>
      );
    }
    if (appState === "ready") {
      return <SearchPage />;
    }
    if (appState === "initial") {
      return (
        <InitialPage
          hasLegacyData={hasLegacyData}
          onImport={importArchive}
        />
      );
    }
    return (
      <Stack mih="calc(100vh - 58px)" align="center" justify="center" p="xl">
        <Alert icon={<IconAlertTriangle />} color="red" maw={560}>
          <Title order={2} mb="xs">
            {t("initializationError")}
          </Title>
          <Text mb="md">{t("initializationHelp")}</Text>
          <Button onClick={initialize}>{t("retry")}</Button>
        </Alert>
      </Stack>
    );
  })();

  return (
    <>
      {(appState === "ready" || appState === "error") && (
        <AppHeader
          canGoHome
          resetting={isClearing}
          onHome={goHome}
        />
      )}
      {content}
    </>
  );
}
