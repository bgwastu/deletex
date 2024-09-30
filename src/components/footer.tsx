"use client";

import { clear } from "@/database/db";
import { appStateAtom } from "@/state";
import { Anchor, Button, Flex } from "@mantine/core";
import { useFetch } from "@mantine/hooks";
import { useSetAtom } from "jotai";
import { useCallback, useState } from "react";

interface FooterAds {
  text: string;
  url: string;
}

export default function Footer() {
  const [isDeleting, setIsDeleting] = useState(false);
  const { data, loading } = useFetch<FooterAds>("/api/get-footer-ads");
  const setAppState = useSetAtom(appStateAtom);

  const resetData = useCallback(async () => {
    const confirmation = confirm("Are you sure you want to reset all data?");
    if (!confirmation) return;

    setIsDeleting(true);
    await clear();
    setAppState("initial");
    setIsDeleting(false);
  }, [setAppState]);

  return (
    <Flex justify="space-between" component="footer" mt="lg" align="center">
      <Button
        variant="outline"
        onClick={resetData}
        color="red.8"
        loading={isDeleting}
      >
        Reset all the data
      </Button>
      <Anchor href={data?.url} c="dimmed" fw="normal">
        {loading ? "Loading..." : data?.text}
      </Anchor>
    </Flex>
  );
}
