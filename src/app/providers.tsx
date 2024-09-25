"use client";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      person_profiles: "identified_only",
      capture_pageview: false, // Disable automatic pageview capture, as we capture manually
    });
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
