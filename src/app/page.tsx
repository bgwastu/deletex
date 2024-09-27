"use client";

import { db, migrate } from "@/database/db";
import InitialPage from "@/screens/initial-page";
import SearchPage from "@/screens/search-page";
import { appStateAtom } from "@/state";
import { Loader, Stack, Text } from "@mantine/core";
import { sql } from "drizzle-orm";
import { useAtom } from "jotai";
import { useEffect } from "react";

export default function Home() {
  const [appState, setAppState] = useAtom(appStateAtom);

  useEffect(
    function initial() {
      (async () => {
        await migrate();
        const res = await db?.execute(sql`SELECT COUNT(*) FROM tweets;`);
        const count = res?.rows[0]?.count;

        if (count === 0) {
          setAppState("initial");
        } else {
          setAppState("ready");
        }
      })();
    },
    [setAppState]
  );

  if (appState === "loading") {
    return (
      <Stack mih="99vh" align="center" justify="center">
        <Loader />
        <Text>Initializing, please wait...</Text>
      </Stack>
    );
  } else if (appState === "ready") {
    return <SearchPage />;
  } else if (appState === "initial") {
    return <InitialPage />;
  }

  return <></>;
}
