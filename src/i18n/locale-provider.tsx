"use client";

import { DatesProvider } from "@mantine/dates";
import "dayjs/locale/en";
import "dayjs/locale/id";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { messages, type Locale, type MessageKey } from "./messages";

const localeTags: Record<Locale, string> = { en: "en-US", id: "id-ID" };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  formatNumber: (value: number) => string;
  formatDateTime: (value: Date) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale: Locale;
}) {
  const [locale, updateLocale] = useState(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function setLocale(nextLocale: Locale) {
    updateLocale(nextLocale);
    localStorage.setItem("deletex.locale", nextLocale);
    document.cookie = `deletex.locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
  }

  function t(key: MessageKey, values: Record<string, string | number> = {}) {
    let message: string = messages[locale][key];
    for (const [name, value] of Object.entries(values)) {
      message = message.replaceAll(`{${name}}`, String(value));
    }
    return message;
  }

  const tag = localeTags[locale];
  const value: I18nContextValue = {
    locale,
    setLocale,
    t,
    formatNumber: (number) => new Intl.NumberFormat(tag).format(number),
    formatDateTime: (date) =>
      new Intl.DateTimeFormat(tag, {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date),
  };

  return (
    <I18nContext.Provider value={value}>
      <DatesProvider settings={{ locale }}>{children}</DatesProvider>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside LocaleProvider");
  return context;
}
