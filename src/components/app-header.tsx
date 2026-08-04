"use client";

import DeleteXIcon from "@/components/deletex-icon";
import LanguageSelector from "@/components/language-selector";
import { useI18n } from "@/i18n/locale-provider";
import {
  Box,
  Container,
  Group,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";

export default function AppHeader({
  canGoHome,
  resetting,
  onHome,
}: {
  canGoHome: boolean;
  resetting: boolean;
  onHome: () => void;
}) {
  const { t } = useI18n();

  return (
    <Box
      component="header"
      bg="white"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        borderBottom: "1px solid var(--mantine-color-brand-2)",
      }}
    >
      <Container size="md">
        <Group h={58} justify="space-between" wrap="nowrap">
          <Tooltip label={canGoHome ? t("returnHome") : t("home")} disabled={!canGoHome}>
            <UnstyledButton
              aria-label={canGoHome ? t("returnHome") : t("home")}
              disabled={!canGoHome || resetting}
              onClick={onHome}
              style={{ borderRadius: "var(--mantine-radius-sm)" }}
            >
              <Group gap="sm" wrap="nowrap">
                <DeleteXIcon />
                <Title order={1} size="h3" lh={1}>DeleteX</Title>
              </Group>
            </UnstyledButton>
          </Tooltip>
          <Group gap="xs" wrap="nowrap">
            <LanguageSelector />
          </Group>
        </Group>
      </Container>
    </Box>
  );
}
