"use client";

import { useI18n } from "@/i18n/locale-provider";
import type { Locale } from "@/i18n/messages";
import { Select } from "@mantine/core";

export default function LanguageSelector() {
  const { locale, setLocale, t } = useI18n();
  return (
    <Select
      aria-label={t("language")}
      value={locale}
      onChange={(value) => value && setLocale(value as Locale)}
      data={[
        { value: "en", label: `🇬🇧 ${t("english")}` },
        { value: "id", label: `🇮🇩 ${t("indonesian")}` },
      ]}
      allowDeselect={false}
      size="sm"
    />
  );
}
